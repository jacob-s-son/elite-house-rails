

//list the map fragments in a matrix that matches their physical position,
//and define a path prefix and suffix
var 
fragments = [
	['top-left','top-center','top-right'], 
	['middle-left','middle-center','middle-right'], 
	['bottom-left','bottom-center','bottom-right']
	],
path = 'images/sliding-map/',
suffix = '.jpg';

//compile an array of full image paths, and cache the fragments 
Transitions.cache((path + fragments[0].concat(fragments[1]).concat(fragments[2]).join(suffix + ',' + path) + suffix).split(','));

//increase the step-resolution for smoother animation
//and so that we can run transitions with a lower minimum speed
Transitions.define('step-resolution', 32);

//nb. leave the long-fallback option disabled, so the fallback swaps are instant



//define some ALT text descriptions to go with each map fragment
//using a base description template, with fragment-specific variations
//defined in arrays that match the structure of the fragments
var 
descriptions = {
	base : 'Map of Australia, focused on %fragment.', 
	fragments : [
		['the north of Western Australia', 'the Northern Territory', 'Northern Queensland'],
		['Western Australia', 'South Australia', 'southern Queensland and New South Wales'],
		['the seas below Albany, south of Western Australia', 'the seas below Adelaide, South Australia', 'Victoria and Tasmania']
		]
	},
	
//create two pointers for tracking the indices 
//of the currently-visible fragment in the fragments matrix
//they default to 1,1 because the view starts righ in the middle
x = 1,
y = 1,

//define a flag we'll use to record whether we're responding to a given event
//which we can also use as a filter to ignore events while a transition is in progress
respond = false;



//save a reference to the map container, the fragment image inside it, 
//and a dictionary of directional trigger links (indexed by direction)
//and a dictionary of double-slide animation-types that correspond with those directions
//nb. the dictionary will eventually contain references to each link
//but we start with it containing text values for the triggers
var 
map = document.getElementById('map'),
fragment = document.getElementById('fragment'),
triggers = {
	north : '\u2191',
	east : '\u2192',
	south : '\u2193',
	west : '\u2190'
	},
types = {
	north : 'DTB',
	east : 'DRL',
	south : 'DBT',
	west : 'DLR'
	};

//then iterate through and populate the dictionary with 
//created triggering links, appended to the main map container,
//with matching class names that hook into the trigger CSS
//the links all need an href to make them keyboard accessible 
//doesn't matter what it is, so may as well be a link back to the map
//and they also need descriptive tooltips as user-action prompts
for(var i in triggers)
{
	if(!triggers.hasOwnProperty(i)) { continue; } 
	
	var trigger = document.createElement('a');
	trigger.appendChild(document.createTextNode(triggers[i]));
	trigger.className = 'direction ' + i;

	trigger.href = '#' + map.id;
	trigger.title = 'Slide the map ' + i;
	
	triggers[i] = map.appendChild(trigger);
}



//now bind a general click handler to the map, 
//to capture clicks on the triggers; DOM0 will do
map.onclick = function(e)
{
	//get and save the target reference, and convert any text node targets
	var target = e ? e.target : window.event.srcElement;
	if(target.nodeType == 3) { target = target.parentNode; }
	
	//if the target is not a directional trigger, 
	//just allow it through and we're done
	if(target.className.indexOf('direction') < 0) { return true; }
	
	//then only proceed if the respond flag is false 
	//so we know no transition is already in progress
	if(!respond)
	{
		//identify direction from the trigger's class name
		var direction = target.className.replace('direction ', '');
	
		//then we only respond to actions where we 
		//haven't reached the edge of the map in the specified direction
		//and if we're good, we just have to update the x or y counter
		//to refer to the fragment that's in that direction 
		//nb. the lengths evaluations assume a fragments matrix where
		//the length of each array and the matrix itself are all equal (which they are)
		if(direction == 'north' && y > 0)
		{
			y--;
			respond = true;
		}
		else if(direction == 'east' && x < fragments[0].length - 1)
		{
			x++;
			respond = true;
		}
		else if(direction == 'west' && x > 0)
		{
			x--;
			respond = true;
		}
		else if(direction == 'south' && y < fragments.length - 1)
		{
			y++;
			respond = true;
		}
		
		//if we're responding to this event
		if(respond)
		{
			//run a slow-ish double-slide transition in the applicable direction
			//passing the image reference, the new fragment SRC and correspond ALT text description
			Transitions.slide(
				fragment, 
				path + fragments[y][x] + suffix, 
				descriptions.base.replace('%fragment', descriptions.fragments[y][x]),
				1.6,
				types[direction],
				
				//and when it completes, clear the respond flag  
				function() { respond = false; });
		}
	}
		
	//don't follow the link whatever
	return false;
};







