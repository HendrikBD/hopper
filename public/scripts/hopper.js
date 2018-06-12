(function() {

  var urls = ["https://news.ycombinator.com/rss", "https://deepmind.com/blog/feed/basic"];

  document.querySelector(".hamburger").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.add("open");
  })
  
  document.querySelector(".sidebar .header .back").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.remove("open");
  })

  var request = new XMLHttpRequest();
  var url = "/rss?q=" + urls[0];
  url = prepUrl(urls)


  request.onreadystatechange = function(){
    if (request.readyState === XMLHttpRequest.DONE) {
      if(request.status === 200) {
        var response = JSON.parse(request.response);
        console.log(response);
      }
    } else {
      // console.log("Not yet...");
    }
  }
  request.open('GET', url);
  request.send();

})();

function prepUrl(urls){
  let path = "/rss?url=";
  urls.forEach(function(url){
    path += url;
    path +=",";
  })
  path = path.slice(0,-1);
  return path;
}
