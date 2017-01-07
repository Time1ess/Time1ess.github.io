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
      for(var index in data){
        var item = data[index];
        var key_word = item['title']+' - ';
        var tags = item['tags'];
        var date = item['date'];
        for(var idx in tags)
          key_word += ' '+tags[idx]['name'];
        key_word += ' '+date.substr(0, 10);
        key_words.push(key_word);
        var path = '/'+item['path'];
        urls.push(path);
      }
      $('#search-keywords').typeahead({
        source: key_words,

        afterSelect: function (item) {
          window.location.href = (urls[key_words.indexOf(item)]);
        }
      })
  });
});
