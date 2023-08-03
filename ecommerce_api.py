import os

from flask import Blueprint, Response, request, jsonify, stream_with_context
from square.client import Client
from dateutil.relativedelta import relativedelta
from datetime import date, datetime
import requests

import ai
import popular_items_analysis

ecommerce_api_endpoints = Blueprint('ecommerce_api', __name__)

import ai
@ecommerce_api_endpoints.route('/api/ecommerce-generate', methods=['POST'])
def generate_response():
  if (request.json["locale"].startswith("en")):
    stream_response = ai.ask(request.json["messages"])
  else:
    stream_response = ai.ask(request.json["messages"], request.json["locale"])
  return Response(stream_with_context(stream_response), mimetype='text/event-stream')

@ecommerce_api_endpoints.route('/api/fetch-store-catalog', methods=['GET'])
def fetch_store_catalog():
  client = Client(
    access_token=os.environ['SQUARE_ACCESS_TOKEN'],
    environment='sandbox')
  catalog_api = client.catalog
  response = client.catalog.list_catalog(types = "ITEM")
  items = response.body

  # Keep track of image object ids to later retrieve image urls.
  response_items = []
  object_ids = []
  for item in items["objects"]:
    if "item_data" in item and "image_ids" in item["item_data"]:
      image_id = item["item_data"]["image_ids"][0]
      object_ids.append(image_id)
      response_items.append(item)

  # Batch retrieve image urls for all image object ids.
  image_id_to_image_url = {}
  images = catalog_api.batch_retrieve_catalog_objects(body={"object_ids": object_ids})
  for image in images.body["objects"]:
    image_id_to_image_url[image["id"]] = image["image_data"]["url"]

  # Add image urls to response items.
  for i in range(len(response_items)):
    image_id = object_ids[i]
    image_url = image_id_to_image_url[image_id]
    item = response_items[i]["item_data"]["image_url"] = image_url

  return jsonify(response_items)

@ecommerce_api_endpoints.route('/api/generate-product', methods=['POST'])
def generate_product():
  engine_id = "stable-diffusion-xl-beta-v2-2-2"
  api_host = os.getenv('API_HOST', 'https://api.stability.ai')
  api_key = os.getenv("STABILITY_API_KEY")

  if api_key is None:
      raise Exception("Missing Stability API key.")
  response = requests.post(
      f"{api_host}/v1/generation/{engine_id}/text-to-image",
      headers={
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": f"Bearer {api_key}"
      },
      json={
          "text_prompts": [
              {
                  "text": request.json["prompt"]
              }
          ],
          "cfg_scale": 7,
          "clip_guidance_preset": "FAST_BLUE",
          "height": 512,
          "width": 512,
          "samples": 1,
          "steps": 30,
      },
  )
  if response.status_code != 200:
      raise Exception("Non-200 response: " + str(response.text))
  data = response.json()["artifacts"]
  return data

def calculate_age(birth_date):
  today = date.today()
  birth_date = datetime.strptime(birth_date, "%Y-%m-%d").date()
  age = relativedelta(today, birth_date)
  return age.years

@ecommerce_api_endpoints.route('/api/fetch-customers', methods=['GET'])
def fetch_customers():
  client = Client(
    access_token=os.environ['SQUARE_ACCESS_TOKEN'],
    environment='sandbox')
  customers_api = client.customers
  response = customers_api.list_customers()

  age_buckets = {
      "<18": 0,
      "18-24": 0,
      "25-34": 0,
      "35-44": 0,
      "45-54": 0,
      "55-64": 0,
      "65+": 0
  }
  for customer in response.body["customers"]:
    if "birthday" in customer:
      age = calculate_age(customer["birthday"])
      if age < 18:
        age_buckets["<18"] += 1
      elif age < 25:
        age_buckets["18-24"] += 1
      elif age < 35:
        age_buckets["25-34"] += 1
      elif age < 45:
        age_buckets["35-44"] += 1
      elif age < 55:
        age_buckets["45-54"] += 1
      elif age < 65:
        age_buckets["55-64"] += 1
      else:
        age_buckets["65+"] += 1

  return jsonify({
    'ageBuckets': age_buckets,
    'customers': response.body["customers"][:20]
  })

@ecommerce_api_endpoints.route('/api/popular-items-analysis', methods=['GET'])
def api_popular_items_analysis():
  return jsonify(popular_items_analysis.run_report())

# @ecommerce_api_endpoints.route('/api/store-subscriptions-analysis', methods=['GET'])
# def square_subscriptions_analysis():
#   return jsonify(subscription_analysis.run_report())