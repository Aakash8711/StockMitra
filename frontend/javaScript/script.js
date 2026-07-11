window.addEventListener("load", ()=>{
    let name = document.querySelector(".name");
    let intro = document.querySelector(".intro-loader");
    
    if (name) {
        setTimeout(()=>{
            name.style.opacity='1'
            name.style.transform="translateY(0)"
        },300)
    }

    if (intro) {
        setTimeout(()=>{
            intro.style.top="-100%"
            // Hide the loader completely after transition finishes (1000ms transition time)
            setTimeout(() => {
                intro.style.display = 'none';
            }, 1000);
        },2000)
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            navLinks.classList.toggle("mobile-active");
            menuToggle.classList.toggle("open");
        });
        
        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("mobile-active");
                menuToggle.classList.remove("open");
            });
        });
    }
});

