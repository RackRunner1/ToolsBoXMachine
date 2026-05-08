const checkBtn = document.getElementById('check-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-corrected-btn');
const textInput = document.getElementById('text-input');
const resultsDiv = document.getElementById('results');
const resultsHeader = document.getElementById('results-header');
const langRadios = document.querySelectorAll('input[name="langMode"]');
const copyFeedback = document.getElementById('copy-feedback');

// Load saved language
const savedLang = localStorage.getItem('tbxm_corrector_lang');
if (savedLang) {
  const radio = document.querySelector(`input[name="langMode"][value="${savedLang}"]`);
  if (radio) radio.checked = true;
}

// Save language on change
langRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    localStorage.setItem('tbxm_corrector_lang', e.target.value);
  });
});

clearBtn.addEventListener('click', () => {
  textInput.value = '';
  resultsDiv.innerHTML = '';
  resultsHeader.style.display = 'none';
  textInput.focus();
});

copyBtn.addEventListener('click', () => {
  textInput.select();
  document.execCommand('copy');
  
  copyFeedback.classList.add('show');
  setTimeout(() => {
    copyFeedback.classList.remove('show');
  }, 2000);
});

checkBtn.addEventListener('click', async () => {
  const text = textInput.value;
  if (!text) return;

  const originalBtnText = checkBtn.innerHTML;
  checkBtn.textContent = 'Checking...';
  checkBtn.disabled = true;
  resultsDiv.innerHTML = '';
  resultsHeader.style.display = 'none';

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
      resultsHeader.style.display = 'flex';
      data.matches.forEach(match => {
        const errorItem = document.createElement('div');
        errorItem.className = 'error-item';
        errorItem.style.animation = 'fadeIn 0.3s ease-out forwards';
        
        const errorMsg = document.createElement('p');
        const errorText = match.context.text.substring(match.context.offset, match.context.offset + match.context.length);
        errorMsg.innerHTML = `<strong>Error:</strong> <span style="color: #ef4444; font-weight: 600;">"${errorText}"</span> - ${match.message}`;
        errorMsg.style.marginBottom = '0.75rem';
        
        errorItem.appendChild(errorMsg);
        
        if (match.replacements && match.replacements.length > 0) {
          const btnGroup = document.createElement('div');
          btnGroup.style.display = 'flex';
          btnGroup.style.flexWrap = 'wrap';
          btnGroup.style.gap = '0.5rem';

          match.replacements.slice(0, 5).forEach(rep => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-badge';
            btn.textContent = rep.value;
            btn.onclick = () => applyReplacement(match, rep.value);
            btnGroup.appendChild(btn);
          });
          errorItem.appendChild(btnGroup);
        }
        
        resultsDiv.appendChild(errorItem);
      });
    } else {
      resultsDiv.innerHTML = '<div class="error-item" style="border-left-color: #4ade80; background: rgba(74, 222, 128, 0.1);"><p style="color: #4ade80; font-weight: 600;">✨ No errors detected! Your text looks great.</p></div>';
    }
  } catch (err) {
    resultsDiv.innerHTML = '<p style="color: #ef4444;">Error during verification. Please check your internet connection.</p>';
  } finally {
    checkBtn.innerHTML = originalBtnText;
    checkBtn.disabled = false;
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
