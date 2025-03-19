// function openMenu(){
//     let menu = document.getElementById('menu');
//     console.log('OpenMenu');
//     menu.classList.toggle('show');
// }
document.getElementById("open").addEventListener("click", function() {
    const menu = document.getElementById("menu");
    menu.classList.toggle("visible");
});
