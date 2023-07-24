var CURRENT_PAGE = 0;
var MAX_PAGES = 1;  

function display_listings(items) {
  items.forEach((item) => {
  var listing_entry = document.createElement('div');
  listing_entry.innerHTML = '';
  var listing_header = '';
  if(item['image']) {
    listing_header += '<div class="listing-bg" style="background-image:url('+item['image']+') !important;">';
  } else {
    listing_header += '<div class="listing-bg no-image">';
  }
  if(item['price']) {
    listing_header += '<div class="listing-price">'+item['price']+'</div>';
  }
  listing_header += '</div>';
  listing_entry.innerHTML += listing_header;
  listing_entry.innerHTML += '<div class="listing-title"><a href="'+item['link']+'">'+item['title']+'</a></div>';
  listing_entry.innerHTML += '<div class="listing-toggle-description"><button class="toggle-description" onclick="toggle_description(\''+item['guid']+'\')">More info <span>&#11167;</span></button></div>';
  listing_entry.innerHTML += '<div class="listing-description '+item['guid']+'">'+item['description']+'</div>';
  listing_entry.innerHTML += '<div class="listing-link"><a href="'+item['link']+'"><button><span>&#128489;</span>Contact Seller</button></a></div>';
  listing_entry.setAttribute('data-timestamp', item['timestamp']);
  listing_entry.className = 'single_listing listing_'+item['category'];
  document.getElementById('listings_body').appendChild(listing_entry);
  var divList = $('.single_listing');
  divList.sort(function(a, b){
    return $(a).data('timestamp')-$(b).data('timestamp')
  });
  $('#listings_body').html(divList);
  });
}

function toggle_description(listing_id) {
  $('.listing-description.'+listing_id).toggle();
}

function fetch_listings() {
  return new Promise(function(return_listings) {
  if(CURRENT_PAGE >= MAX_PAGES) {
    var listings = [];
    return_listings(listings);
  } else {
  /* var search_terms = '#bitcoin'; */
  var search_terms = '#lnads';
  var search_category = $('#search_category').val();
  var valid_categories = ['buying','selling','job','service'];
  if(valid_categories.includes(search_category)) {
    var search_terms = search_terms+' #'+search_category;
  }
  var search_term = $('#search_term').val().toLowerCase();
  if(search_term) {
    var search_terms = search_terms+' '+search_term;
  }
  var u = 'https://nostr.realsearch.cc/nostr?method=search&q='+encodeURIComponent(search_terms)+'%20-filter%3Aspam&p='+CURRENT_PAGE;
  var t = Math.floor(Date.now() / 1000);
  var url_api = 'https://allorigins.bitejo.com/raw?url='+encodeURIComponent(u)+'&t='+t;
  var url = new URL(url_api);
  var listings = [];
  fetch(url).then((res) => {
    res.text().then((res_text) => {
      var json_text = JSON.parse(res_text);
      MAX_PAGES = json_text['page_count'];
      json_text['serp'].forEach((item) => {
        var clean_description = item['content'].replace(/<[^>]*>?/gm, '').replace(/[\u00A0-\u9999<>\&]/gim, function(i) { return '&#'+i.charCodeAt(0)+';'; });
        var description_lowercase = clean_description.toLowerCase();
        var category = 'none';
        if(description_lowercase.includes('#selling')) {
          var category = 'selling';
        } else if(description_lowercase.includes('#buying')) {
          var category = 'buying';
        } else if(description_lowercase.includes('#job')) {
          var category = 'trade';
        } else if(description_lowercase.includes('#service')) {
          var category = 'service';
        }
        var title = clean_description.slice(0, 60)+'…';
        var description = clean_description.replace(/(?:\r\n|\r|\n)/g, '<br>');
        var nostr_timestamp = (new Date(item['created_at']).getTime()/1000);
        var timestamp = Math.floor(Date.now() / 1000);
        var guid_hex = item['id'];
        var guid_bin = new Uint8Array(guid_hex.length / 2);
        for(let i = 0; i < guid_bin.length; i++) {
          guid_bin[i] = parseInt(guid_hex.substr(2 * i, 2), 16);
        }
        var guid_bech32 = bech32.encode('note', guid_bin);
        var link = 'https://nostr.band/'+guid_bech32;
        var img = item['content'].match(/(https?:\/\/([a-z0-9\/\._-])+\.(?:jpe?g|gif|png|webp))/i);
        if((!img) || (img[0] === undefined)) {
          var img_link = false;
        } else {
          var img_link = img[0];
        }
        var scrape_price = item['content'].match(/(([0-9km\,\.]{1,20})\ (?:btc|bitcoin|sats|sat))/i);
        if((!scrape_price) || (scrape_price[0] === undefined)) {
          var price = false;
        } else {
          var price = scrape_price[0];
        }
        var listing_details = {'guid': guid_bech32, 'title': title, 'description': description, 'timestamp': timestamp, 'link': link, 'category': category, 'image': img_link, 'price': price};
        listings.push(listing_details);
      });
      return_listings(listings);
    });
  });
  }
});
}

function filter_listings() {
  CURRENT_PAGE = 0;
  MAX_PAGES = 1;
  $('#listings_body').html('');
  fetch_listings().then((fetched_listings) => {
    display_listings(fetched_listings);
  });
}

$("#search").submit(function(e) {
  e.preventDefault();
});

document.body.onload = function(){
  var win = $(window);
  fetch_listings().then((fetched_listings) => {
    display_listings(fetched_listings);
  });
  win.scroll(function() {
    if ($(document).height() - win.height() == win.scrollTop()) {
      CURRENT_PAGE++;
      fetch_listings().then((fetched_listings) => {
        display_listings(fetched_listings);
      });
    }
  });
}