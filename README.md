# Readymade — Church collection

A CART 498 Assignment 4 application by Sam Hoyek, adapted with Codex. An audience member describes an ordinary object. The app writes a fictional museum tombstone and an extended label, then generates the object installed in an exhibition **from that label**.

The curatorial world crosses **Outsideness**, Sam Hoyek’s evolving worldbuilding practice, with **Building the Church / Holy Boom!**, his fictional church-building project. The crossover is an application experiment, not a new canonical chapter. No source manuscript is bundled or silently rewritten.

## Concept and prompt rules

In the source fiction, obsolete shipping cardboard becomes hand-worked sacred architecture. The Church is simultaneously a place of worship, construction, study, and creative labour. Its collective promise remains entangled with obedience, institutional control, and the loss of individuality. Outsideness contributes recognizable reality disturbed through ritual spectacle and synthetic mythology. Here the museum’s accession of a pocket object becomes another way that an institution consecrates matter. That last connection is an interpretive proposal for this app.

The app does not automatically turn every object into cardboard, a cathedral or occult symbolism. Its material identity must remain recognizable. Each label chooses one concrete tension rather than reciting the entire world.

The IAE devices draw on Alix Rule and David Levine’s [“International Art English” (2012)](https://tc3.canopycanopycanopy.com/legacy/contents/international_art_english): abstract nominalizations, long subordinated sentences, theoretical framing verbs, and institutional authority. They become explicit rules in `gallery.py`:

1. Preserve the object’s material, colour, wear, recognizable form and former use. Scale changes must be explicit in its dimensions.
2. Invent every artist and theoretical reputation. No real artists, critics, curators, celebrity founders or attributed quotations.
3. Produce all tombstone fields: artist and bio, title, year, medium, dimensions, provenance, credit line.
4. Keep the extended label at 80–120 words and cite one invented theorist and their invented book within it.
5. Use abstract nominalizations, a subordinated sentence, and an institutional framing verb, anchored in physical details.
6. Make setting and dimensions explicit and visually coherent.

The editable curatorial direction appears in settings. Assignment rules and the bounded world context are added on the server, so changing a tone does not remove the required format. Object descriptions are treated as descriptive data rather than system instructions. These measures reduce instruction conflicts; no prompt can guarantee perfect semantic compliance, and generated names or details still need human review.

## Label → exhibition image

The text request uses a strict JSON schema. The server checks required fields, field types, completion status, the 80–120-word range, the theorist/book citation, dimensions and the allowed setting. Invalid or interrupted output does not trigger an image call; there is no automatic retry.

The image prompt is constructed exclusively from the validated label and selected image look. The raw audience description and editable curatorial direction are not sent separately to the image model. The label’s object description, medium, dimensions and setting supply the physical instructions. A 600 × 400 cm object should fill a room, while a small object belongs on a suitable support; architecture and display furniture give scale cues. The image excludes rendered wall-label text, signatures, and portraits.

The output pairs exhibition documentation with a structured tombstone and extended label. Each accession exposes its derived image prompt for inspection and offers image, plain-text label, and JSON downloads. Image failures retain the complete label.

## User guide

1. Describe one object from your pocket, bag or desk. Include its colour, material, damage and ordinary use.
2. Optionally expand settings to change the curatorial direction, model, temperature, label budget or documentation look.
3. Select **Accession object**. The label is generated first; its image follows.
4. Read the image beside the label. Check that the object and scale match, and that names and citations remain fictional.
5. Download anything you want to retain. Collection history and settings persist in this browser on this origin; they do not sync across devices.

**Pause motion** stops the background video and particles. Reduced-motion and hidden-tab behavior are retained. The background uses a texture from the earlier free Hugging Face generation, animated through an exact 15-second travelling-wave cycle without a dissolve or reverse playback. Background provenance is in `static/art/background-periodic-provenance.json`.

## Reflection — analytical draft for Sam’s review

A language model can reproduce this dialect because its linguistic patterns recur across art-world documents. Predicting the next plausible phrase can reproduce the appearance of curatorial authority without establishing a convincing interpretation. Rule and Levine’s account of recognition and status makes that distinction useful here. The Church’s sacred reuse and the museum’s accession both change an object’s standing through an institutional frame. This machine tests that parallel, but its fluency is also its risk: an elegant label can conceal a failure to attend to the object. Material accuracy and the label-to-image chain make that failure visible rather than treating fluent prose as evidence of thought.

This is AI-assisted analysis, not a claim that Sam has personally completed the reading or approved this reflection. The source fiction remains Sam’s; implementation and generated labels are distinct artifacts.

## Run locally

Python 3.11 or later:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your OPENAI_API_KEY and a random FLASK_SECRET_KEY in .env.
python app.py
```

Open `http://127.0.0.1:5071`. Never commit `.env` or an API key.

## Deployment

Create a **new public repository for this assignment**, preserving the local development commits. It is separate from the earlier coursework repository and the source Flask fork.

On Render, create a Python Web Service connected to that repository:

- Build: `pip install -r requirements.txt`
- Start: `gunicorn app:app --timeout 240`
- Environment: `OPENAI_API_KEY` and a random `FLASK_SECRET_KEY`

Submit the new repository URL and working deployment URL to the [Assignment 4 Moodle portal](https://moodle.concordia.ca/moodle/mod/assign/view.php?id=4616706). Public repository creation, deployment, final reflection approval and Moodle submission remain separate from local implementation.

## Models, limits and costs

Text defaults to `gpt-4.1-mini`; image generation uses `gpt-image-1-mini`, low quality, 1024 × 1024, one image per request. No automated retries. The five-image server ledger is a conservative experiment allowance, **not an account-wide dollar cap**. It resets when ephemeral server storage is lost. Configure provider-side budget controls before wider public use. Failed image calls consume an attempt. The app serializes complete generations within each worker; use a single worker for this classroom prototype.

## Verification

```sh
python -m unittest discover -s tests -v
node --check static/studio.js
```

Tests mock the provider: label schema/word-count failures, label-first image chaining, absence of raw-description leakage, partial image failure, busy/exhausted allowances, input validation, CSRF and required page controls. A live paid provider generation must be checked separately; mocked fixtures are not evidence of model output or visual fidelity.

See `SOURCES.md` for the bounded source map. No real theorist is presented as a fictional citation in generated labels.
