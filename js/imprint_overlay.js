document.getElementById('imprintLink').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('imprintOverlay').style.width = "100%";
});

document.querySelector('.closebtn').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('imprintOverlay').style.width = "0%";
});