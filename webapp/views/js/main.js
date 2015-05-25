"use strict";

// dom elements

var menuButton = document.getElementById("menu-toggle");
var menuOffCanvas = document.getElementById('nav-off-canvas');

console.log(menuOffCanvas);

// event listeners

menuButton.addEventListener('click', function() {

	if (menuButton.title == "false") {
		
		menuOffCanvas.style.left = '90vw';
		menuButton.title = "true";
	
	} else {

		menuOffCanvas.style.left = '105vw';
		menuButton.title = "false";

	}

});

