document.addEventListener('DOMContentLoaded', function() {
    // Initialize feature inputs
    loadFeatureInputs();

    // Diagnosis form handler
    document.getElementById('diagnosisForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';

        try {
            const features = [];
            document.querySelectorAll('.feature-input').forEach(input => {
                if (input.tagName === 'SELECT') {
                    const customInput = document.querySelector(`#${input.id}-custom`);
                    if (input.value === 'custom' && customInput.value) {
                        features.push(parseFloat(customInput.value));
                    } else if (input.value !== 'custom') {
                        features.push(parseFloat(input.value));
                    }
                } else {
                    features.push(parseFloat(input.value));
                }
            });

            if (features.length !== 22) {
                throw new Error('Please provide all 22 feature values');
            }

            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ features })
            });

            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Prediction failed');
            
            displayResults(data);
        } catch (error) {
            showError(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Run Diagnosis';
        }
    });

    // Chat form handler
    document.getElementById('chatForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const input = document.getElementById('questionInput');
        const question = input.value.trim();
        if (!question) return;

        const chatResponse = document.getElementById('chatResponse');
        chatResponse.innerHTML += `<div class="user-question">You: ${question}</div>`;
        input.value = '';
        input.disabled = true;
        
        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to get response');
            
            chatResponse.innerHTML += `<div class="assistant-response">Assistant: ${data.response}</div>`;
        } catch (error) {
            chatResponse.innerHTML += `<div class="error">Error: ${error.message}</div>`;
        } finally {
            input.disabled = false;
            chatResponse.scrollTop = chatResponse.scrollHeight;
        }
    });
});

async function loadFeatureInputs() {
    try {
        const response = await fetch('/feature_ranges');
        if (!response.ok) throw new Error('Failed to load feature ranges');
        
        const featureRanges = await response.json();
        const featureInputs = document.getElementById('featureInputs');
        featureInputs.innerHTML = '';
        
        Object.entries(featureRanges).forEach(([featureName, ranges], index) => {
            const div = document.createElement('div');
            div.className = 'mb-3 feature-input-group';
            
            div.innerHTML = `
                <label for="feature${index}" class="form-label">
                    ${featureName.replace(/_/g, ' ')}
                    <small class="text-muted">(Range: ${ranges.min.toFixed(2)} - ${ranges.max.toFixed(2)})</small>
                </label>
                <select class="form-select feature-input" id="feature${index}">
                    <option value="${ranges.avg.toFixed(6)}">Average (${ranges.avg.toFixed(2)})</option>
                    <option value="${ranges.min.toFixed(6)}">Minimum (${ranges.min.toFixed(2)})</option>
                    <option value="${ranges.max.toFixed(6)}">Maximum (${ranges.max.toFixed(2)})</option>
                    <option value="custom">Custom value...</option>
                </select>
                <input type="number" step="any" class="form-control mt-2 custom-value" 
                       id="feature${index}-custom" style="display: none;"
                       placeholder="Enter value between ${ranges.min.toFixed(2)} and ${ranges.max.toFixed(2)}"
                       min="${ranges.min}" max="${ranges.max}">
            `;
            
            featureInputs.appendChild(div);
            
            // Show/hide custom input
            document.getElementById(`feature${index}`).addEventListener('change', function() {
                const customInput = document.getElementById(`feature${index}-custom`);
                customInput.style.display = this.value === 'custom' ? 'block' : 'none';
            });
        });
    } catch (error) {
        console.error("Error loading feature ranges:", error);
        createDefaultInputs();
    }
}

function createDefaultInputs() {
    const featureInputs = document.getElementById('featureInputs');
    featureInputs.innerHTML = '';
    
    for (let i = 0; i < 22; i++) {
        const div = document.createElement('div');
        div.className = 'mb-3';
        div.innerHTML = `
            <label for="feature${i}" class="form-label">Feature ${i+1}</label>
            <input type="number" step="any" class="form-control feature-input" 
                   id="feature${i}" required>
        `;
        featureInputs.appendChild(div);
    }
}

function displayResults(data) {
    document.getElementById('results').innerHTML = `
        <h4>${data.prediction}</h4>
        <div class="explanation">${data.explanation}</div>
        <h5 class="mt-3">Feature Values:</h5>
        <div class="table-responsive">
            <table class="table table-sm">
                <tbody>
                    ${Object.entries(data.features).map(([key, val]) => `
                        <tr>
                            <td>${key.replace(/_/g, ' ')}</td>
                            <td>${parseFloat(val).toFixed(6)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('medicalReport').innerHTML = data.report;
}

function showError(message) {
    document.getElementById('results').innerHTML = `
        <div class="alert alert-danger">
            <h5>Error</h5>
            <p>${message}</p>
        </div>
    `;
}