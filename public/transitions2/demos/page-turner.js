

//list all the page images, in two groups (left and right) for easier referencing
//and define a path prefix and suffix
var 
pages = [['1L','2L','3L','4L','5L','6L'], ['1R','2R','3R','4R','5R','6R']],
path = 'images/page-turner/page-',
suffix = '.jpg';

//compile an array of full image paths, and cache the flags 
Transitions.cache((path + pages[0].concat(pages[1]).join(suffix + ',' + path) + suffix).split(','));

//increase the step-resolution for smoother animation
//and so that we can run transitions with a lower minimum speed
Transitions.define('step-resolution', 32);

//nb. leave the long-fallback option disabled, so the fallback swaps are instant



//define some ALT text descriptions to go with each pair of pages
var descriptions = [
	'Ara Pehlivanian is having fun with data-tables.',
	'Cameron Adams looks at vector graphics using canvas.',
	'Michael Mahemoff talks about debugging and profiling with Firebug.',
	'Dan Webb takes us on a journey into meta-programming.',
	'James Edwards creates a 3D perspective maze with CSS.',
	'Simon Willison mashes-up Flickr and Google Maps.'
	],
	
//define the page turning effects we'll be using 
//(with the animation types in the same order as the top-level pages array)
//nb. there are several possibilities for a page-turn transition:
//	"grow" => ["RL","LR"]
//	"skew" => ["BRB","BLB"]
//	"skew" => ["TRC","TLA"]
effects = {
	transition : 'grow',
	animations : ['RL','LR']
	},
	
//create a pointer for tracking which page we're viewing
//(which represents an index in both pages arrays)
pageview = 0;



//save references to the two triggering links, and to the images inside them
//(defined in a matrix with the same structure as the pages arrays)
for(var triggers = [], images = [], i=0; i<2; i++)
{
	triggers[i] = document.getElementById('trigger' + i);
	images[i] = document.getElementById('image' + i);
	
	//set a URL on the link to make it keyboard accessible
	//(doesn't matter what the href is so it may as well point back to itself)
	//and set a descriptive tooltip for a user-action prompt
	triggers[i].href = '#' + triggers[i].id;
	triggers[i].title = 'Turn to the ' + (i == 0 ? 'previous' : 'next') + ' page'
	
	//bind an index property so we can refer to it from the handler
	triggers[i].__index = i;
	
	//now bind the link's click handler; DOM0 will do 
	triggers[i].onclick = function()
	{
		//define an array that controls the order of page effects 
		//(left->right if we clicked left, or right->left if we clicked right)
		var order = [0,1];
		
		//then if we clicked left we're decrementing the page pointer, 
		//or if we clicked right then we're incrementing, and we must
		//also reverse the order array to reverse the order of page transitions
		//if the pointer reaches either end, cycle round to continue
		if(this.__index == 0)
		{ 
			if(--pageview < 0) 
			{ 
				pageview = pages[0].length - 1; 
			} 
		}
		else 
		{ 
			if(++pageview == pages[0].length) 
			{ 
				pageview = 0; 
			} 
			order.reverse();
		}
		
		//now call the specified transition, on the specified next pages, in order
		//as well as updating their ALT text with the applicable page description
		//the transitions are very fast, with the first turn slightly slower than the second
		//and the first is also a reverse transition, so it shrinks the page from the right-edge to the center
		//while the second is a forward transition to grow it from the center out to the left-edge
		Transitions[effects.transition](
			images[order[0]], 
			path + pages[1][pageview] + suffix, 
			descriptions[pageview], 
			0.2, 
			effects.animations[order[0]], 
			0, 
			true, 
			function()
			{
				Transitions[effects.transition](
					images[order[1]], 
					path + pages[0][pageview] + suffix, 
					descriptions[pageview], 
					0.15, 
					effects.animations[order[1]]
					);
			});

		
		//don't follow the link
		return false;
	}
}


