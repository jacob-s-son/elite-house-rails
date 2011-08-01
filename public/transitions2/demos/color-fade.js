

//list the colored flags, and define a path prefix and suffix
var 
flags = ['red','gold','blue','purple','green'],
path = 'images/color-fade/',
suffix = '.png';

//compile an array of full image paths, and cache the flags 
Transitions.cache((path + flags.join(suffix + ',' + path) + suffix).split(','));

//increase the step-resolution for smoother animation
//and so that we can run transitions with a lower minimum speed
Transitions.define('step-resolution', 32);

//enable the long-fallback option, so we get proper sequencing of the fallback behavior
Transitions.define('long-fallback', true);



//get a reference to the trigger link, and to the image inside it
var 
trigger = document.getElementById('trigger'),
image = document.getElementById('image');

//set a URL on the link to make it keyboard accessible
//(doesn't matter what the href is so it may as well point back to itself)
//and give it a descriptive tooltip for a user-action prompt
trigger.href = '#' + trigger.id;
trigger.title = 'Start the color-fade sequence';



//define the color-fade sequence function
//along with a counter for tracking its progress 
var n = 0, sequence = function()
{
    //call a fairly-fast fade transition, passing the data it needs
    Transitions.fade(image, path + flags[n] + suffix, flags[n] + ' flag.', 0.8, 

    //when it completes, increment the counter then recur
    //and keep doing this until we've been through the whole set 
    function()
    {
        if(++n < flags.length) { sequence(); }
    });
};


//now bind the link's click handler; DOM0 will do 
trigger.onclick = function()
{
	//reset the counter and start the sequence
	n = 0;
	sequence();

	//don't follow the link
	return false;
};


