// Video og bildegalleri på innleggssidene. Ingen eksterne avhengigheter.
(function () {
  // --- Video: forhåndsvisningen er et lokalt bilde. Selve spilleren hentes først ved klikk,
  // så det går ingen trafikk til YouTube eller Vimeo før den besøkende velger å spille av.
  var players = {
    youtube: function (id) { return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0'; },
    vimeo: function (id) { return 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?autoplay=1&dnt=1'; }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.video-play');
    if (!b) return;
    var box = b.closest('.video');
    var make = players[box.dataset.video];
    if (!make) return;
    var f = document.createElement('iframe');
    f.src = make(box.dataset.id);
    f.title = box.dataset.title || 'Video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    b.replaceWith(f);
    f.focus();
  });

  // --- Galleri: ett stort bilde med småbildene på én rad under. Man blar på siden,
  // og kan åpne samme bilde i fullskjerm. Uten JavaScript er småbildene vanlige lenker til bildene.
  function swipe(el, go) {
    var x0 = null;
    el.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    el.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { el.dataset.swiped = '1'; go(dx < 0 ? 1 : -1); }
    });
  }

  document.querySelectorAll('.gallery').forEach(function (g) {
    var items = [].slice.call(g.querySelectorAll('a'));
    if (!items.length) return;
    var i = 0;

    var v = document.createElement('div');
    v.className = 'viewer';
    v.innerHTML =
      '<div class="v-stage">' +
        '<button type="button" class="v-main" aria-label="Vis bildet i fullskjerm"><img alt=""></button>' +
        '<button type="button" class="v-nav v-prev" aria-label="Forrige bilde">‹</button>' +
        '<button type="button" class="v-nav v-next" aria-label="Neste bilde">›</button>' +
        '<button type="button" class="v-full" aria-label="Vis bildet i fullskjerm"><span aria-hidden="true">⤢</span> Fullskjerm</button>' +
      '</div>' +
      '<p class="v-cap"><span class="v-text"></span><span class="v-count"></span></p>';
    g.parentNode.insertBefore(v, g);
    g.classList.add('is-thumbs');

    var d = document.createElement('dialog');
    d.className = 'lightbox';
    d.setAttribute('aria-label', 'Bildevisning i fullskjerm');
    d.innerHTML =
      '<button type="button" class="lb-close" aria-label="Lukk fullskjerm">×</button>' +
      '<button type="button" class="lb-prev" aria-label="Forrige bilde">‹</button>' +
      '<figure><img alt=""><figcaption><span class="lb-text"></span><span class="lb-count"></span></figcaption></figure>' +
      '<button type="button" class="lb-next" aria-label="Neste bilde">›</button>';
    document.body.appendChild(d);

    var vImg = v.querySelector('img'), vText = v.querySelector('.v-text'), vCount = v.querySelector('.v-count');
    var dImg = d.querySelector('img'), dText = d.querySelector('.lb-text'), dCount = d.querySelector('.lb-count');

    function show(n) {
      i = (n + items.length) % items.length;
      var a = items[i];
      var src = a.getAttribute('href');
      var alt = a.querySelector('img').alt || '';
      var cap = a.dataset.caption || alt;
      var count = (i + 1) + ' / ' + items.length;
      vImg.src = src; vImg.alt = alt; vText.textContent = cap; vCount.textContent = count;
      if (d.open) { dImg.src = src; dImg.alt = alt; }
      dText.textContent = cap; dCount.textContent = count;
      items.forEach(function (x, k) {
        if (k === i) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current');
      });
      // Hold det aktive småbildet synlig når raden kan skyves sidelengs
      var li = a.parentNode;
      if (g.scrollWidth > g.clientWidth) g.scrollTo({ left: li.offsetLeft - g.offsetLeft - (g.clientWidth - li.offsetWidth) / 2, behavior: 'smooth' });
    }
    function step(k) { show(i + k); }
    function open() { d.showModal(); dImg.src = items[i].getAttribute('href'); dImg.alt = vImg.alt; }

    items.forEach(function (a, n) {
      a.addEventListener('click', function (e) { e.preventDefault(); show(n); });
    });
    v.querySelector('.v-prev').addEventListener('click', function () { step(-1); });
    v.querySelector('.v-next').addEventListener('click', function () { step(1); });
    v.querySelector('.v-full').addEventListener('click', open);
    v.querySelector('.v-main').addEventListener('click', function () {
      if (this.dataset.swiped) { delete this.dataset.swiped; return; }
      open();
    });
    v.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    swipe(v.querySelector('.v-main'), step);

    d.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
    d.querySelector('.lb-next').addEventListener('click', function () { step(1); });
    d.querySelector('.lb-close').addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    d.addEventListener('close', function () { v.querySelector('.v-full').focus(); });
    swipe(d, step);

    show(0);
  });
})();
