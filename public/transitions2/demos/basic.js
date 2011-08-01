

//cache the flag we'll be swapping
Transitions.cache(['images/basic/australia.png']);

//increase the step-resolution for smoother animation
Transitions.define('step-resolution', 32);

//nb. leave the long-fallback option disabled, so the fallback swaps are instant



//bind a javascript: href to the triggering link
//that fires a random wipe-transition with the flag we're swapping
document.getElementById('trigger').href = 'javascript:'
	+ 'Transitions.skew("#image", "images/basic/australia.png", "Flag of Australia.", "2", "RND");'
	+ 'void(null);';



