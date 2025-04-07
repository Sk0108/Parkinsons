from flask import Flask, render_template, request, jsonify
from parkinsons import run_diagnosis_assistant, ask_chat, svc, scalar, initialize_models
import numpy as np
import markdown2
import logging
from datetime import datetime

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/feature_ranges')
def get_feature_ranges():
    try:
        parkinsons = pd.read_csv('parkinsons.data')
        features = parkinsons.drop(['status', 'name'], axis=1)
        return jsonify({
            col: {
                'min': float(features[col].min()),
                'max': float(features[col].max()),
                'avg': float(features[col].mean())
            } for col in features.columns
        })
    except Exception as e:
        logger.error(f"Feature ranges error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if len(data['features']) != 22:
            return jsonify({'error': 'Exactly 22 features required'}), 400

        np_data = np.asarray(data['features'])
        scaled_data = scalar.transform(np_data.reshape(1, -1))
        prediction = svc.predict(scaled_data)
        result = "Parkinson's disease likely present" if prediction[0] == 1 else "No signs of Parkinson's"

        features_dict = {f"Feature_{i+1}": val for i, val in enumerate(data['features'])}
        explanation, report = run_diagnosis_assistant(features_dict, result)
        
        return jsonify({
            'prediction': result,
            'explanation': markdown2.markdown(explanation),
            'report': markdown2.markdown(report),
            'features': features_dict
        })
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/ask', methods=['POST'])
def ask():
    try:
        response = ask_chat(request.json['question'])
        return jsonify({'response': response})
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if initialize_models():
        app.run(host='0.0.0.0', port=5000)