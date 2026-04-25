const checkBtn = document.getElementById('check-btn');
const textInput = document.getElementById('text-input');
const resultsDiv = document.getElementById('results');

checkBtn.addEventListener('click', async () => {
  const text = textInput.value;
  if (!text) return;

  checkBtn.textContent = 'Correcting...';
  resultsDiv.innerHTML = '';

  try {
    const params = new URLSearchParams();
    const lang = document.querySelector('input[name="langMode"]:checked').value;
    params.append('language', lang);
    params.append('text', text);

    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      body: params,
    });
    
    const data = await response.json();
    
    if (data.matches && data.matches.length > 0) {
      data.matches.forEach(match => {
        const errorItem = document.createElement('div');
        errorItem.className = 'error-item';
        
        const errorMsg = document.createElement('p');
        errorMsg.innerHTML = `<strong>Error detected:</strong> "${match.context.text.substring(match.context.offset, match.context.offset + match.context.length)}" - ${match.message}`;
        errorMsg.style.marginBottom = '0.5rem';
        
        errorItem.appendChild(errorMsg);
        
        if (match.replacements && match.replacements.length > 0) {
          match.replacements.slice(0, 5).forEach(rep => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-badge';
            btn.textContent = rep.value;
            btn.onclick = () => applyReplacement(match, rep.value);
            errorItem.appendChild(btn);
          });
        }
        
        resultsDiv.appendChild(errorItem);
      });
    } else {
      resultsDiv.innerHTML = '<p style="color: #4ade80;">No errors detected!</p>';
    }
  } catch (err) {
    resultsDiv.innerHTML = '<p style="color: #ef4444;">Error during verification.</p>';
  } finally {
    checkBtn.textContent = 'Correct';
  }
});

function applyReplacement(match, newValue) {
  const currentText = textInput.value;
  const start = match.offset;
  const end = match.offset + match.length;
  
  // Replace in text
  textInput.value = currentText.substring(0, start) + newValue + currentText.substring(end);
  
  // Restart correction to update offsets
  checkBtn.click();
}
