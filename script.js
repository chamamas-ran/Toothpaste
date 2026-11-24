/* ==========================================================
   Toothpaste — shared script (product / order / admin)
   Each page is detected by the elements it contains.
   ========================================================== */

(function () {
  'use strict';

  var APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbz1ER9zFS5_Ol5JFSf7RrBWDIRNn-VbAGxJX3aN3yQqz6XUSXIzZPjK40twJUd166PS/exec';

  var ORDERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRempBOuNw5jakmliwY7D52iA3Imu3OFGYRQonH53BYdhliJtwtbvl6UFGxuugtgqKHKaJIhminqxcn/pub?gid=0&single=true&output=csv';

  var MOODS = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'fresh', label: 'Fresh' },
    { value: 'confident', label: 'Confident' },
    { value: 'gentle', label: 'Gentle' }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('product-list')) initProductPage();
    if (document.getElementById('orderForm')) initOrderPage();
    if (document.querySelector('#ordersTable tbody')) initAdminPage();
  });

  /* ---------- helpers ---------- */

  function formatPrice(n) {
    var num = Number(n);
    return isNaN(num) ? String(n) : num.toLocaleString('th-TH');
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ==========================================================
     1) product.html
     ========================================================== */

  function initProductPage() {
    var listEl = document.getElementById('product-list');
    var barEl = document.getElementById('filter-bar');
    var products = [];
    var current = 'all';

    function isValidMood(m) {
      return MOODS.some(function (x) { return x.value === m; });
    }

    function renderFilters() {
      if (!barEl) return;
      barEl.innerHTML = '';
      MOODS.forEach(function (m) {
        var btn = el('button', 'chip', m.label);
        btn.type = 'button';
        btn.setAttribute('data-filter', m.value);
        btn.setAttribute('aria-pressed', String(m.value === current));
        btn.addEventListener('click', function () {
          setFilter(m.value, true);
        });
        barEl.appendChild(btn);
      });
    }

    function setFilter(mood, updateUrl) {
      current = mood;
      if (barEl) {
        Array.prototype.forEach.call(barEl.querySelectorAll('.chip'), function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === current));
        });
      }
      if (updateUrl && window.history && history.replaceState) {
        var url = new URL(window.location.href);
        if (current === 'all') url.searchParams.delete('mood');
        else url.searchParams.set('mood', current);
        history.replaceState(null, '', url.toString());
      }
      renderProducts();
    }

    function buildCard(p) {
      var card = el('article', 'card');
      card.setAttribute('data-mood', p.mood);

      var media = el('div', 'card__media');
      var img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      media.appendChild(img);
      card.appendChild(media);

      var body = el('div', 'card__body');
      body.appendChild(el('h3', 'card__title', p.name));
      body.appendChild(el('span', 'flavor-bar'));

      var meta = el('div', 'card__meta');
      meta.appendChild(el('span', 'flavor-dot'));
      meta.appendChild(el('span', '', 'ขนาด ' + p.size));
      body.appendChild(meta);

      var footer = el('div', 'card__footer');
      var price = el('span', 'price', formatPrice(p.price));
      price.appendChild(el('small', '', ' บาท'));
      footer.appendChild(price);

      var order = el('a', 'btn btn--primary btn--sm', 'สั่งซื้อ');
      order.href =
        'order.html?item=' + encodeURIComponent(p.name) +
        '&price=' + encodeURIComponent(p.price);
      footer.appendChild(order);

      body.appendChild(footer);
      card.appendChild(body);
      return card;
    }

    function renderProducts() {
      listEl.innerHTML = '';
      var shown = products.filter(function (p) {
        return current === 'all' || p.mood === current;
      });
      if (!shown.length) {
        listEl.appendChild(el('p', 'text-mute', 'ไม่พบสินค้าในหมวดนี้'));
        return;
      }
      shown.forEach(function (p) { listEl.appendChild(buildCard(p)); });
    }

    var param = new URLSearchParams(window.location.search).get('mood');
    if (param) param = param.toLowerCase();
    current = param && isValidMood(param) ? param : 'all';
    renderFilters();

    fetch('products.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        renderProducts();
      })
      .catch(function (err) {
        console.error(err);
        listEl.innerHTML = '';
        listEl.appendChild(el('p', 'text-mute', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'));
      });
  }

  /* ==========================================================
     2) order.html
     ========================================================== */

  function initOrderPage() {
    var form = document.getElementById('orderForm');
    var params = new URLSearchParams(window.location.search);

    var itemsEl = document.getElementById('items');
    var totalEl = document.getElementById('total');
    var item = params.get('item');
    var price = params.get('price');

    // Fill both fields on load
    if (itemsEl && item !== null) itemsEl.value = item;
    if (totalEl && price !== null) totalEl.value = price;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var payload = {
        customerName: document.getElementById('customerName').value.trim(),
        contact: document.getElementById('contact').value.trim(),
        items: document.getElementById('items').value.trim(),
        total: document.getElementById('total').value.trim(),
        note: document.getElementById('note').value.trim()
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(function () { window.location.href = 'thankyou.html'; })
        .catch(function (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ==========================================================
     3) admin.html
     ========================================================== */

  // Minimal CSV parser: handles quoted fields, escaped quotes ("")
  // and line breaks inside quotes. Returns an array of rows.
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;

    if (text.charCodeAt(0) === 0xfeff) i = 1; // strip BOM

    for (; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }

    // last field / row without trailing newline
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    // drop completely empty rows
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector('#ordersTable tbody');
    var COLS = 6; // date, name, contact, items, total, note

    function showMessage(msg) {
      tbody.innerHTML = '';
      var tr = document.createElement('tr');
      var td = el('td', 'text-mute', msg);
      td.colSpan = COLS;
      td.style.textAlign = 'center';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage('กำลังโหลดข้อมูล...');

    fetch(ORDERS_CSV_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        rows.shift(); // header row
        rows.reverse(); // newest first (sheet appends new orders at the bottom)

        if (!rows.length) {
          showMessage('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        tbody.innerHTML = '';
        rows.forEach(function (r) {
          var tr = document.createElement('tr');
          for (var i = 0; i < COLS; i++) {
            var value = r[i] !== undefined ? r[i] : '';
            if (i === 4 && value !== '' && !isNaN(Number(value))) {
              value = formatPrice(value);
            }
            tr.appendChild(el('td', '', value));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (err) {
        console.error(err);
        showMessage('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      });
  }
})();
