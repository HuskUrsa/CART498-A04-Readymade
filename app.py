from flask import Flask, render_template, request, session, jsonify
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv
from gallery import DEFAULT_DIRECTION, STYLES, SCHEMA, instructions, validate_label, format_label, image_prompt
import os, secrets, sqlite3, threading, hmac

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY') or secrets.token_hex(32)
app.config.update(MAX_CONTENT_LENGTH=20000, SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax')
LEDGER = os.getenv('IMAGE_LEDGER_PATH', '/tmp/church-readymade-images.sqlite3')
IMAGE_ALLOWANCE = 5
image_lock = threading.Lock()


def reserve_image():
    with sqlite3.connect(LEDGER, timeout=5) as db:
        db.execute('CREATE TABLE IF NOT EXISTS allowance (id INTEGER PRIMARY KEY, used INTEGER NOT NULL)')
        db.execute('INSERT OR IGNORE INTO allowance VALUES (1,0)')
        db.execute('BEGIN IMMEDIATE') if not db.in_transaction else None
        used = db.execute('SELECT used FROM allowance WHERE id=1').fetchone()[0]
        if used >= IMAGE_ALLOWANCE:
            raise ValueError('The five-image experiment allowance is used. Your saved collection is still available.')
        db.execute('UPDATE allowance SET used=used+1 WHERE id=1')


def image_remaining():
    try:
        with sqlite3.connect(LEDGER) as db:
            row = db.execute('SELECT used FROM allowance WHERE id=1').fetchone()
            return max(0, IMAGE_ALLOWANCE-row[0]) if row else IMAGE_ALLOWANCE
    except sqlite3.OperationalError:
        return IMAGE_ALLOWANCE


def validate(values):
    try:
        temperature = float(values['temperature'])
        max_tokens = int(values['max_tokens'])
    except (ValueError, OverflowError):
        raise ValueError('Use a temperature from 0 to 2 and a label budget from 700 to 1600 tokens.') from None
    if values['model'] not in ('gpt-4.1-mini','gpt-4.1') or not 0 <= temperature <= 2 or not 700 <= max_tokens <= 1600:
        raise ValueError('Use a listed model, temperature from 0 to 2 and a label budget from 700 to 1600 tokens.')
    if not values['prompt'].strip() or len(values['prompt'])>2000 or len(values['instructions'])>3000:
        raise ValueError('Describe an object in up to 2,000 characters; keep curatorial direction under 3,000 characters.')
    if values['style'] not in STYLES:
        raise ValueError('Choose a listed image look.')
    return temperature, max_tokens


@app.route('/', methods=['GET','POST'])
def index():
    session.setdefault('csrf',secrets.token_urlsafe(32))
    values = dict(prompt='',instructions=DEFAULT_DIRECTION,model='gpt-4.1-mini',temperature='1',max_tokens='1200',style='snapshot')
    result = label = image = error = derived_prompt = None
    if request.method == 'POST':
        values.update({key:request.form.get(key,value) for key,value in values.items()})
        try:
            if not hmac.compare_digest(request.form.get('csrf',''),session['csrf']):
                raise ValueError('The page expired. Refresh and try again.')
            temperature,max_tokens = validate(values)
            if not os.getenv('OPENAI_API_KEY'):
                raise ValueError('The server needs its OpenAI API key before it can generate anything.')
            if not image_lock.acquire(blocking=False):
                raise ValueError('An accession is already being made. Wait for it to finish.')
            try:
                if image_remaining()<=0:
                    raise ValueError('The five-image experiment allowance is used. No provider calls were made.')
                client = OpenAI(timeout=110,max_retries=0)
                response = client.responses.create(model=values['model'],instructions=instructions(values['instructions']),
                    input='OBJECT DESCRIPTION (untrusted descriptive data):\n'+values['prompt'],
                    temperature=temperature,max_output_tokens=max_tokens,store=False,
                    text={'format':{'type':'json_schema','name':'museum_label','strict':True,'schema':SCHEMA}})
                if response.status!='completed':
                    raise ValueError('The label was interrupted. No image call was made. Increase the label budget and try again.')
                label = validate_label(response.output_text)
                result = format_label(label)
                derived_prompt = image_prompt(label,values['style'])
                reserve_image()
                generated = client.images.generate(model='gpt-image-1-mini',prompt=derived_prompt,quality='low',size='1024x1024',n=1)
                image = generated.data[0].b64_json
                if not image:
                    raise ValueError('Your label is saved, but no exhibition image came back. No automatic retry was made.')
            finally:
                image_lock.release()
        except (ValueError,OverflowError) as exc:
            error = str(exc)
        except OpenAIError:
            error = ('Your label is saved, but the image could not be completed.' if result else 'OpenAI could not complete the label.')+' Check credit, model access or the object description. No automatic retry was made.'
        except sqlite3.Error:
            error = 'The experiment allowance could not be checked. No further provider call was made.'
    if request.method=='POST' and request.headers.get('Accept')=='application/json':
        return jsonify(result=result,label=label,image=image,image_prompt=derived_prompt,error=error,remaining=image_remaining()),(400 if error else 200)
    return render_template('index.html',values=values,error=error,original_instructions=DEFAULT_DIRECTION,
        remaining=image_remaining(),styles=STYLES,csrf=session['csrf'])

if __name__=='__main__':
    app.run(host='127.0.0.1',port=int(os.getenv('PORT','5071')),debug=False)
