import io
import os
from flask import Flask, current_app, request, jsonify, Response, stream_with_context, session
from werkzeug.utils import secure_filename
from flask_cors import CORS, cross_origin
from googleapiclient.discovery import build
import requests
import ai

from ecommerce_api import ecommerce_api_endpoints

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}

app = Flask(__name__, static_url_path='', static_folder='frontend/build')
app.secret_key = os.environ.get("FLASK_SECRET_KEY")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.register_blueprint(ecommerce_api_endpoints)

if os.environ.get("ENV") == "development":
  CORS(app, supports_credentials=True)
  print("CORS enabled in development", "ENV", os.environ.get("ENV"))
else:
  print("CORS disabled in production", "ENV", os.environ.get("ENV"))

OPEN_API_KEY = os.environ.get("OPEN_API_KEY")
GOOGLE_CLOUD_API_KEY = os.environ.get("GOOGLE_CLOUD_API_KEY")
SHIPENGINE_API_KEY = os.getenv("SHIPENGINE_API_KEY")

def translate_text(text, target="en"):
  service = build("translate", "v2", developerKey=GOOGLE_CLOUD_API_KEY)
  response = service.translations().list(target=target, q=[text]).execute()
  # Extract the translated text from the response
  translated_text = response['translations'][0]['translatedText']
  return translated_text

def text_to_speech(text, target="en"):
  # Create a service object for the Text-to-Speech API
  service = build('texttospeech', 'v1', developerKey=GOOGLE_CLOUD_API_KEY)
  # Set the audio output parameters
  audio_config = {
      'audioEncoding': 'MP3'
  }
  # Set the voice parameters
  voice = {
      'languageCode': target,  # Language code
      'ssmlGender': 'FEMALE'  # Voice gender
  }
  # Perform the text-to-speech synthesis
  response = service.text().synthesize(
      body={
          'input': {
              'text': text
          },
          'voice': voice,
          'audioConfig': audio_config
      }
  ).execute()

  return response['audioContent']

@app.route('/')
def index():
  return current_app.send_static_file('index.html')

@app.route('/api/generate', methods=['POST'])
def generate_response():
  if (request.json["locale"].startswith("en")):
    stream_response = ai.toucan_ask(request.json["prompt"])
  else:
    stream_response = ai.toucan_ask(request.json["prompt"], request.json["locale"])
  return Response(stream_with_context(stream_response), mimetype='text/event-stream')

@app.route('/api/synthesize-speech', methods=['POST'])
def synthesize_speech():
  # Get the synthesized speech audio content
  audio_content = text_to_speech(request.json["text"], request.json["locale"])
  return jsonify({"audioContent": audio_content})

@app.route('/api/estimate-ship-rate', methods=['POST'])
def estimate_ship_rate():
  response = requests.post("https://api.shipengine.com/v1/rates/estimate",
    headers={"Content-Type":"application/json", "API-key": SHIPENGINE_API_KEY},
    json=request.json
    )
  return response.json()

def allowed_file(filename):
  return '.' in filename and \
          filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['GET', 'POST'])
def upload_file():
  if request.method == 'POST':
    # check if the post request has the file part
    if 'file' not in request.files:
      return jsonify({'success': False, 'error': 'POST request missing file part'}), 400

    file = request.files['file']
    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '':
      return jsonify({'success': False, 'error': 'user does not select a file'}), 400

    if file and allowed_file(file.filename):
      filename = secure_filename(file.filename)
      file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
      file.save(file_path)

      session['injected_context_filename'] = file_path
      print(session)
      return jsonify({'success': True, 'filename': filename})

@app.route('/api/injected_context_filename', methods=['DELETE'])
def clear_injected_context_filename():
  deleted_context_filename = session.pop('injected_context_filename', None)
  if deleted_context_filename:
    os.remove(deleted_context_filename)
  return jsonify({'success': True, 'deletedContextFilename': deleted_context_filename})
