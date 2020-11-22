fetch('/setup-status').then(r => r.json()).then(status => {
  Object.entries(status).forEach(([step, status]) => {
    let el = document.querySelector('#' + step);
    if (el) {
      el.classList.toggle('complete', status);
    }
  });
}).catch(e => console.error(e));