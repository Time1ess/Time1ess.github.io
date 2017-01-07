$(document).ready(function()
{
  var fku = 0;
  var key_words = new Array();
  var urls = new Array();
  $(document).keyup(function(e){ 
    var sku = new Date().getTime();
    var interval = sku-fku;
    fku = sku;
    if(e.keyCode == 17 && interval < 500) 
    {
      search_panel_switch();
      fku = 0;
    }
  });
  function search_panel_switch()
  {
    if($('#search-panel').css('display')=='none')
      {
        $('#search-panel').css('display', 'block');
      }
      else
      {
        $('#search-panel').css('display', 'none');
      }
  }
  $('#search-open').click(function()
  {
      search_panel_switch();
  })
  $('#search-close').click(function()
  {
    $("#search-panel").css("display", "none");
    fku = 0;
  })
  $.getJSON("/content.json").done(function (data) {
    alert(data);
    if(data.code == 0)
    {
      for(var index in data.data){
        var item = data.data[index];
        var key_word = item['title']+' - ';
        var tags = item['tags'];
        var date = item['date'];
        for(var idx in tags)
          key_word += ' '+tags[idx];
        key_word += ' '+date;
        key_words.push(key_word);
        var url = item['url'];
        urls.push(url);
      }
      alert(key_words);
      alert(urls);
      $('#search-keywords').typeahead({
        source: key_words,

        afterSelect: function (item) {
          window.location.href = (urls[key_words.indexOf(item)]);
        }
      })
    }
  });
});
