(function() {

  document.querySelector(".hamburger").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.add("open");
  })
  
  document.querySelector(".sidebar .header .back").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.remove("open");
  })

  var request = new XMLHttpRequest();
  var url = "/rss?q=two";
  request.onreadystatechange = function(){
    if (request.readyState === XMLHttpRequest.DONE) {
      if(request.status === 200) {
        console.log(request.response);
        // var response = JSON.parse(request.response);
        // console.log(response);
      }
    } else {
      console.log("Not yet...");
    }
  }
  request.open('GET', url);
  request.send();

})();
