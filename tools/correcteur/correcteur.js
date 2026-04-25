const checkBtn = document.getElementById('check-btn');
const textInput = document.getElementById('text-input');
const resultsDiv = document.getElementById('results');

checkBtn.addEventListener('click', async () => {
  const text = textInput.value;
  if (!text) return;

  checkBtn.textContent = 'Correction en cours...';
  resultsDiv.innerHTML = '';

  try {
    const params = new URLSearchParams();
    params.append('language', 'fr');
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
        errorMsg.innerHTML = `<strong>Faute détectée :</strong> "${match.context.text.substring(match.context.offset, match.context.offset + match.context.length)}" - ${match.message}`;
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
      resultsDiv.innerHTML = '<p style="color: #4ade80;">Aucune erreur détectée !</p>';
    }
  } catch (err) {
    resultsDiv.innerHTML = '<p style="color: #ef4444;">Erreur lors de la vérification.</p>';
  } finally {
    checkBtn.textContent = 'Corriger';
  }
});

function applyReplacement(match, newValue) {
  const currentText = textInput.value;
  const start = match.offset;
  const end = match.offset + match.length;
  
  // Remplacer dans le texte
  textInput.value = currentText.substring(0, start) + newValue + currentText.substring(end);
  
  // Relancer la correction pour mettre à jour les offsets
  checkBtn.click();
}
