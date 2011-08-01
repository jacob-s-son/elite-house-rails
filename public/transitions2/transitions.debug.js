/*******************************************************************************
 IX2.0 :: Image Transitions 2.0
 ------------------------------------------------------------------------------
 Copyright (c) 2004-11 James Edwards (brothercake)       <cake@brothercake.com>
 BSD License                          See license.txt for licensing information
 Info/Docs       http://www.brothercake.com/site/resources/scripts/transitions/
 ------------------------------------------------------------------------------
*******************************************************************************/
function Transitions(){}
(function()
{

	//-- privileged config variable --//

	//a few global settings that are worth extending to user config
	//users generally won't want to change them, but it's good to give the choice
	//being privileged means that they're private but publically modifiable, 
	//but only via the define() method, they can't be modified directly
	var userconfig = 
	{
		//the step resolution specifies the number of iterations per second for a transition animation
		//so that whatever its actual speed it always has the same even resolution
		//higher numbers give a smoother animation but are MUCH more expensive
		//16 is a little bit coarser than I'd like, but 20 can be too much work 
		//(I did have it as 15, but 16 makes the minimum transition speed
		// come out neatly as 250ms, rather than 266.666ms:
		// the minimum speed of a transition is a factor of step-resolution
		// the default minimum is 0.25s which is based on the default resolution of 16
		// and produces individual timer loops of 62.5ms, with no fewer than 4 steps per transition;
		// the minspeed is determined by the equation ((1 / resolution) * 4) [see argprocess.durationvalue] 
		// so if you set the resolution to 8 then the minimum will be 0.5s; 4 will be 1s; and so on;
		// of course you can go the other way if you want: if you increase the resolution 
		// to say 20 then the min speed will become 0.2s, but note that higher resolutions 
		// are *significantly* more work, even if it's just a small increase, like to 20, principally 
		// because the individual timer loops are faster [20r = 50ms, but some browser/platforms 
		// begin to struggle after 55ms, and end up going slower and/or using a lot more CPU])
		//whatever, the value must be an integer >= 2
		'step-resolution' : 16,
		
		//whether browsers that don't support a particular transition property
		//should still wait for the specified duration before doing the 
		//fallback image swap, or not; the idea of having this enabled 
		//is that you can use it for something like a slideshow, with 
		//many synchronised transitions, and be confident that browsers 
		//which don't support the transition property will still run 
		//through the slides in a timely fashion, rather than ripping
		//through them all instantly, as would happen without this timing;
		//having said that, if you're only doing single ad-hoc transitions
		//just to add panache to what's otherwise a normal image swap
		//then it probably makes more sense to disable this feature
		//it's disabled by default because that's what would be 
		//least confusing for users not expecting the option
		//the value must be trueish, or it's falseish
		'long-fallback' : false,
		
		//the base z-index of created clone images, which must be
		//an integer >= 2, so we can apply (z - 1) and have that come out >= 1
		'base-zindex' : 2
	},


	
	

	//-- private data constants --//
	
	//declare debug mode by defining the debug flag:
	//debug mode has full argument validation and error handling
	//but once you have it all setup and working, you can switch to
	//production mode, which is smaller and faster without that stuff
	//for the benefit of the compressor, or its removal will create a syntax error
	debug = 1,    //"debug," to disable (so it's undefined)
	
	
	//class reference to "this"
	THIS = this,
	
	//shortcuts to some primitives and other values that benefit from compression
	//obviously these names are longer, but they compress to something shorter
	NULL_VALUE = null,
	BOOLEAN_TRUE = true,
	BOOLEAN_FALSE = false,
	
	
	
	//-- private data constants [method and argument name keys] --//
	
	//list all the public methods that perform transition effects
	//we need this list because we're going to build the functions 
	//themselves iteratively; though the subsidiary methods (cache and define)
	//will just be defined as normal because there's only one kind of each
	METHOD_NAMES = 
	[
		//fade the new image with the original
		//this is the only method that requires dummy arguments,
		//which are [4,5,6] ("anitype","plusfade=1","reverse");
		//notably, the dummy value for plusfade is set to 1 rather than 0 
		//so it can be leveraged to implement the fade itself :-)
		'fade'
		
		//wipe the new image over the original
		,'wipe'
		
		//wipe multiple strips of the new image over the original
		//like blinds, squares and checkerboard effects
		,'bars'
		
		//scale the new image over the original
		,'grow'
		
		//rotate the new image over the original
		,'twist'
		
		//skew, twist or flip the new image over the original
		//this is the transform I understand the least, yet it produces 
		//the single most striking effect of the collection -- the "flying flip"!
		,'skew'
		
		//slide the new image over the original [for a single or quad]
		//and correspondingly push-away the old image, in the same direction [for a double]
		,'slide'
	],

	//argument keys arrays, 
	//for compiling the arguments object and validating it in debug mode
	ARGUMENT_KEYS = 
	{
		//list of argument keys for the transition method 
		//(for compiling the arguments object, and validating it in debug mode)
		transitionkeys : ['context','newcontext','alttext','duration','anitype','plusfade','reverse','oncomplete'],
		
		//list of argument keys for the cache method
		cachekeys : ['arrayarg', 'oncomplete'],
		
		//list of argument keys for the define method
		//this only has one argument, an object of settings
		//and we validate those manually using their own keys
		definekeys : ['namearg', 'valuearg']
	},



	//-- private data constants [transition syntax] --//
	
	//list of possible opacity and transform implementation keys
	//testing vendor-specific and standard syntax, preferring standard;
	//for opacity, most browsers support the standard syntax now (apart from IE of course),
	//the other two are legacy mozilla proprietary, and legacy khtml proprietary, 
	//which is from before it used "webkit" prefixes and chiefly applies to 
	//older versions of Safari and Konqueror, although the modern webkit browsers
	//including Google Chrome do still understand it; for transform, all browsers 
	//currently use a proprietary syntax and there is no standard implementation (afaik)
	//but we may as well list it anyway for high-hope-future-proofing :-O
	///once we've identfied the implementation, we use it as a syntax key to refer to it,
	//which is a nice neat shortcut in the form "image.style[implementation]"
	//nb. we call these "alpha" and "transforms" not "opacity" and "transform"
	//so that they can be compressed without affecting any built-in property names
	IMPLEMENTATION_SYNTAX = 
	{
		alpha : ['opacity','MozOpacity','KhtmlOpacity']
		,transforms : ['transform','MozTransform','WebkitTransform','OTransform']
	},
	
	//additional syntax token to convert transform property syntax into transform-origin
	//eg. "MozTransform" becomes "MozTransformOrigin"; this also means that "transform" 
	//would become "transformOrigin", which we can't test because it's not implemented anywhere,
	//but it's logical, and works exactly like that for every vendor implementation;
	//alternatively we could have created a syntax.transformorigin value when creating 
	//syntax.transforms, but that would take slightly more code than this solution
	ORIGIN_SYNTAX = 'Origin',

	//the syntax key we use to indicate a filter implementation (ie. a version of Windows/IE5.5+)
	//this isn't used for direct identification in quite the same way as other browsers
	//but it is used as a shortcut reference to IE's "filters" collection
	MS_SYNTAX_KEY = 'filters',

	//and a key for indicating browsers having no opacity or transform implementation at all
	//we don't bother checking for implementations of CSS clip and margin though
	//(for wipe, slide and bars); we just assume that we have those since they're so basic
	//and that assumption is safe for every browser that supports this script in the first palce
	NO_SYNTAX_KEY = 'none',
	
	//the name of IE's matrix and alpha filters, 
	//by which we refer to them in its "filters" collection
	//nb. although these names appear to refer to a chain of property references
	//they are in fact pure string values which have dots in them (just to mess with your head!)
	MS_MATRIX_FILTER = 'DXImageTransform.Microsoft.Matrix',
	MS_ALPHA_FILTER = 'DXImageTransform.Microsoft.Alpha',
	
	//this is the style.filter string that initialises matrix and alpha filters in IE
	//it's a bit pernickety to script for multiple filters - you can't refer to them 
	//in the filters collection until you've written them to style.filter, but when you do that
	//you over-write any existing filters, even if you append to the string; so what you have to do
	//is create an initial style.filter declaration that includes every filter declaration you're
	//going to need (space delimited), then you can refer to any of them in the filters collection
	//nb. the sizingMethod value "clip" in the matrix filter means "don't resize the container" 
	//(short for "clip to original", opposite of "auto expand") to match what other implementations do
	//(and it's also the contextual basis of all the matrix translation calculations);
	//the filterType value "nearest neighbor" (opposite of "bilinear") claims to be computed faster 
	//(so says MSDN, and recommends it when the filter is to be animated); 
	//however despite setting this value, when you read back .filterType it still says "bilinear"!
	//maybe it's just my windows setup ... I'm gonna leave it like this anyway;
	//nb. using the more recent progid syntax for the opacity filter, rather than the older 
	//filter:alpha syntax, because apparently the new one renders more efficiently (so says MSDN, again)
	//the alpha filter has to specified *after* the matrix, not before, so that the transform has 
	//computational priority, otherwise there are odd rendering glitches with right-aligned 
	//rotational transforms [as though the left side of the image were clipped]
	MS_FILTER_STRING = 'progid:' + MS_MATRIX_FILTER + '(sizingMethod="clip",filterType="nearest\ neighbor")' 
					 + '\ progid:' + MS_ALPHA_FILTER + '(opacity=100)',
					 
					 
	
	//-- private data constants [data lookups] --//
	
	//a right-angle expressed in radians, just to save converting 90 degrees
	//[we need radians to do the computations for IE's matrix filter, 
	// and other browsers' -vendor-rotate properties are happy with either]
	RIGHT_ANGLE = 1.5707963267948966,

	//list valid animation types, for all transitions except pure fades;
	//these are used for validation, and to implement the RND type
	//and each is identified by its own appname [hence we can't compress them]
	//except for the "wipe" types, which are also shared by "grow" transitions
	ANIMATION_TYPES = 
	{
		//fade has an empty listed member here so that the array always contains
		//at least one member, for the benefit of commas in conditional compilation 
		fade : []
	
		//wipe type acronyms describe the orientation and direction(s), egs.
		//"LR" is "Left to Right"; "TLBR" is "Top-Left to Bottom-Right"; 
		//"CVE" is "Center to Vertical-Edges"; "MLRC" is "Middle-Left to Right-Corners"
		,wipe : 
		[
			'LR','RL','TB','BT','TLBR','TRBL','BLTR','BRTL',
			'MLRC','MRLC','TCBC','BCTC','CVE','CHE','CC'
		]
	
		//slide type acronyms are similar to linear, and describe the orientation and directions(s)
		//plus whether it's a single slide (the new image sliding over the old)
		//or a double slide (the old image also sliding away, like it's being pushed)
		//"STLBR" is "Single Top-Left to Bottom-Right"; "DBT" is "Double Bottom to Top"; 
		//only the single transitions have diagonals because a double would expose the 
		//original underneath, which would then require hiding it, which is a step too far
		//in terms of limiting and modiyfing the source HTML
		,slide :
		[
			'SLR','SRL','STB','SBT','STLBR','STRBL','SBLTR','SBRTL', //the first eight are single slides
			'DLR','DRL','DTB','DBT', //the middle four are double slides (slide-pushes)
			'QCC' //the last one is a quad multi-slide, just for fun :-)
		]
	
		//twist type acronyms describe the origin and clock-direction, eg.
		//"TLC" is "Top-Left and Clockwise", which will anchor the new image 
		//to the origin's top-left corner, by its top-left corner, while rotated -90deg
		//(so its left-edge is flush against the origin's top-edge)
		//then twist it into view 90deg clockwise to settle into position over the top
		//the total rotation for a transition is +/-90deg or +/180deg depending on origin
		//eg. a top-centered origin requires 180deg, but a top-right origin only 90deg
		,twist : 
		[
			'TLC','TLA','TRC','TRA','BLC','BLA','BRC','BRA', //the first eight are 90deg rotations
			'MLC','MLA','MRC','MRA','TCC','TCA','BCC','BCA' //the second eight are 180deg rotations
		]
		
		//skew type acronyms come in two flavours: one is the origin and clock-direction, eg. 
		//"TLC" is "Top-Left and Clockwise", which anchors by the origin's top-left
		//corner and then skews it's left edge from 90deg to zero in a clockwise rotation
		//(looks a bit like a windscreen wiper, only one that compresses the rain inside it
		//rather than wiping it away!); the other flavour is origin and flip-type, either 
		//single or double: a single flip is a dual-skew 45deg horizontal and vertical, making
		//the image appear as though it's turned on its side (on the z-axis, so you're looking 
		//at its thin edge), then un-skews both angles to resolve the shape back to normal; 
		//a double flip is the same only it begins with dual 90deg skews, so the overall effect 
		//is of the image being flipped completely over (and we add rotation and translation 
		//over the first half of the transition, to aid the illusion of viewing the back of the image);
		//there are also centered flips, that are clockwise, anti-clockwise or "flying"!
		//but out of all the transitions in this library, this one is the most, um, scatalogical:
		//I didn't really have a clear idea of what I was trying to acheive with this
		//I just played with various combinations until I'd made some interesting stuff :-)
		,skew :
		[
			'TLC','TLA','TLB','TLF','TLDF','TRC','TRA','TRB','TRF','TRDF', //each four contains two rotations,
			'BLC','BLA','BLB','BLF','BLDF','BRC','BRA','BRB','BRF','BRDF', //one bend, one flip, and one double-flip;
			'MDC','MDA','CDC','CDA', //these are double-rotations
			'TCCF','TCAF','TCFF','BCCF','BCAF','BCFF' //each three has two flips and a flying-flip!
		]
	
		//bars type acronyms describe the bars count, and the orientation 
		//and direction same as the linear types, but with a different 
		//range of values encompassing what this transition supports
		//but part of this data set needs to be built programatically, 
		//so we define it as a function literal -- the function is called 
		//immediately to build and return the array, but because of the literal
		//format it doesn't get called again each time we use it, it just gets
		//called once and returns a static data set for later use at no expense
		//the reason for building it programmatically is to avoid significant code bulk
		//so that we end up with "2LR", "3LR" etc. all the way to "64CHE"
		//(for 1D types), then "2TLBR" up to "8SCHE" (for 2D types)
		//I could have used a replacement token for the number
		//but that would require parsing on the fly each time a transition is called
		//so instead we do the "heavy lifting" (such as it is) in advance
		//and that makes validation and random-selection easier and quicker when needed
		//even if it does use slightly more memory
		,bars : (function()
		{
			//so first define the base raw type values
			var bartypes = 	
			[
				'LR','RL','TB','BT','CVE','CHE', //the first six are 1D transitions (blinds)
				'TLBR','TRBL','BLTR','BRTL','MLRC','MRLC','TCBC','BCTC','CC', //the rest are 2D transitions (squares)
				'SLR','SRL','STB','SBT','SCVE','SCHE' //plus the last six are also "checkboard" transitions
			];
		
			//then run through and populate with numbered values
			forevery(bartypes, function(i, bartype)
			{
				//count from 2 to 64, and create new entries comprised of
				//the number plus the specified type from the array,
				//and push it onto the end of the array
				for(var j=2; j<=64; j++)
				{
					//1D transition types (the first six) can have up to 64 bars
					//but for the rest which are 2D transitions, 64 is 
					//the total number of pieces in the grid, and you specify the axis,
					//which means you can only specify up to 8 [8x8]
					if(i < 6 || j <=8) 
					{ 
						bartypes.push(j + bartype); 
					}
				}
			});

			//finally delete the original, raw types 
			//to leave us with an array of all numbered types
			//ideally the length would be saved to a var
			//but it's noth worth the code or process to do so
			bartypes.splice(0, 21);

			//and return it, which will save it to the bars array
			return bartypes;
			
		})()
	},
	
	
	
	//-- private data constants [miscellanous other] --//

	//dictionary of the properties used by the addLayoutProperties function
	//for defining the fundamental layout styles of the superimposed elements we create
	//nb. the margin, padding and border resets may not be necessary, but better safe than sorry 
	SUPER_LAYOUT_PROPERTIES = 
	{
		position : 'absolute',
		zIndex   : userconfig['base-zindex'],
		margin   : 0,
		padding  : 0,
		border   : 'none'
	},
	
	//properties applied to the inner image when the superimposed element is a containing span
	//these are in addition to the previous set, which are also applied, 
	//so the values defined in this set will cancel-out those that are the same; 
	//the relative positioning is needed by the slide transition, so that we can 
	//move it independently to implement the slide using left/top instead of margin 
	//which works much better and avoids the layout glitches we saw when using margin
	INNER_LAYOUT_PROPERTIES = 
	{
		position : 'relative',
		left     : 0,
		top      : 0
	},





	//-- private data variables --//

	//"running" flags prevent colliding instances
	//they allow for one transition to be running on one element at a time;
	//so multiple instances of the same transition are okay to run
	//on different elements simultenously, but you can't trigger a second 
	//transition on an element until the first has finished
	running = {},

	//rkeys counter is used to assign a key to elements that don't have an ID
	//so that we always have a unique value to use as its running key
	rkeys = 0,
	
	//fade and transform syntax tokens, either specific syntax keys
	//that can be used as direct references, ie. "image.style[impsyntax.alpha]"
	//or for IE or unsupported browsers it's just a token used as a conditional
	//nb. to get this data we need a physical object to set and test them on
	//[see detectImplementationSyntax for details and values]
	impsyntax = { 
		alpha : NULL_VALUE, 
		transforms : NULL_VALUE 
		},
	
	//create shortcuts to BODY and the document-element (usually HTML)
	//which are also not necessarily available yet (if this script is in the HEAD)
	//but will be available by the time we actually need them [in getRealPosition]
	bodynode = NULL_VALUE,
	docnode = NULL_VALUE;





	//-- public data constants --//
	
	//identify supported browsers and set a global flag accordingly
	//this is made public so that users have it available for their own conditions
	//(eg. in the demo they're prevented from running the 
	// demo form initialisation, so it remains disabled)
	//and we use the flag internally within the public method abstractions
	//to exclude unsupported browsers as they're called
	//and also before all the private utility definitions
	//so they don't have to waste resources parsing them
	this.supported = 
	(
		//this excludes all pre-DOM1 browsers
		defined(document.getElementById)	
		
		//this excludes Opera 8 
		//(and any other browser which is missing the stylesheets collection
		// although afaik there is no other such browser that would otherwise pass this far)
		&& defined(document.styleSheets)		
		
		//this excludes older webkit browsers (equivalent to Safari 3 or earlier) 
		//and older gecko browsers (equivalent to Firefox 2 or earlier)
		//we have to create an element to test this, because we can't rely on any document nodes
		//existing at the point when the script is parsed, and document itself doesn't have the method 
		&& defined(makenode().getBoundingClientRect)	
	);
	
	//set a version code property, in case it should be 
	//useful to users to have this data programatically available
	//though offhand I can't think of anything you'd want this for ...
	//still, "the street find its own uses for things", as the saying goes :-)
	this.version = '2.0';


	


	//-- public methods --//

	//run through the list of transition method names 
	//and build a public method wrapper for each one
	//the wrappers are just public-facing shells 
	//that pass their data to the master transition function
	forevery(METHOD_NAMES, function(i, methodname)
	{
		//create the public method from the local method name
		THIS[methodname] = function()
		{
			//if the browser is unsupported, return null for exclusion;
			//we have to allow the wrappers to be defined so that no errors
			//are generated when they're called by unsupported browsers, 
			//then we add this exclusion so they don't go any further 
			//and generate errors from their failure to implement the 
			//transition property, or anything else; they'll just silently fail
			if(!THIS.supported) { return NULL_VALUE; }
			
			//pass the appname, arguments collection and key index
			//(the reference index of the applicable argument keys array)
			//to the argument processing function, then in turn 
			//to the master transition function; and return the result
			return transition(argprocess(arguments.callee.appname, arguments, 'transitionkeys'));
		};
		
		//assign an appname property to the function, 
		//so we have a reference we can use from inside the function
		THIS[methodname].appname = methodname;
	});
	
	
	//create a public wrapper for the cache function
	this.cache = function()
	{
		//if the browser is unsupported, return null for exclusion
		if(!this.supported) { return NULL_VALUE; }
		
		//pass the appname, arguments collection and key index 
		//to the argument processing function, then in turn 
		//to the master cache function; and return the result
		return docache(argprocess('cache', arguments, 'cachekeys'));
	};
	
	
	//create a similar public wrapper for the define function
	this.define = function()
	{
		if(!this.supported) { return NULL_VALUE; }
		
		return dodefine(argprocess('define', arguments, 'definekeys'));
	};
	
	
	//create a public wrapper for the detectImageSupport function
	this.pictures = function()
	{
		//if the browser is unsupported, return null for exclusion
		if(!this.supported) { return NULL_VALUE; }

		//otherwise call and return the detection function
		else { return detectImageSupport(); }
	};

	
	//if the browser is unsupported we can exit here;
	//it will never get as far as any of the private methods
	//so we may as well save it from having to parse them
	if(!this.supported) { return; }





	//-- private methods [master transition control and configuration] --//

	//master transition function, receives a pre-processed arguments object
	//containing all the argument values plus the calling-method name 
	//and in which all undefined values have been set to null
	function transition(args)
	{
		//pass the pre-processed arguments object to the argprepare function 
		//which normalizes all the values, eg. converts a duration string to a number
		args = argprepare(args);
		
		//then if debug mode is true, validate all the arguments
		if(defined(debug)) { args = argvalidate(args, 'transitionkeys'); }


		//save the global shortcut references to BODY and the document-element (usually HTML)
		//if we haven't already created those references this session
		//we have to do this here in case images are disabled and the fallback happens
		//which requires the use of bodynode to force a redraw in opera
		//long before the getRealPosition calls that were previously the host of these statements
		bodynode = bodynode || document.getElementsByTagName('body')[0];
		docnode = docnode || document.documentElement;
		

		//we need to assign a unique runningkey property to the element
		//so that we can refer to it universally to know whether it's busy 
		//since the image may not have an ID, the simplest thing to do 
		//is to assign it a unique custom property, and use that 
		//so, if the element doesn't already have this __ix reference, assign it now
		if(!defined(args.context.__ix))
		{
			args.context.__ix = 'ix' + (rkeys++); 
		}		
		
		//now check the running object for an active member with that __ix
		//if the runningkey is true then there's already a running transition 
		//on the specified element, so return false for busy and we're done
		if(getRunningKey(args.context.__ix) === BOOLEAN_TRUE) 
		{ 
			return BOOLEAN_FALSE; 
		}
		
		//otherwise [it will be null, so] we're good to go, 
		//so now set an active runningkey with the context __ix
		setRunningKey(args.context.__ix, BOOLEAN_TRUE); 
		
		
		//detect whether images are supported in the browser at the moment
		//and if not, call and return the fallback functionality immediately; and we're done
		//if images aren't supported there's little point doing a timed transition; 
		//at best you'll only see the effect on the border of the placeholder, 
		//at worst you won't see anything at all, just a useless pause!
		//so when images are off the alt-text swaps immediately, and that's it, 
		//but this behavior is also controllable with the "long-fallback" option
		if(!detectImageSupport()) 
		{ 
			return fallback(args); 
		}
		
				
		//if plusfade is active
		if(args.plusfade > 0)
		{
			//detect and globally-save the supported form of opacity syntax, 
			//if we haven't already done so this session
			//[if we have, then we already have it saved, but either way
			// the detection method returns whether we have any support]
			//nb. this condition exists 'just in case' even though there are 
			//no known browsers that support the rest of the script but not opacity
			//I don't want to remove it though -- like I say, just in case -- 
			//and it takes hardly any code at all to express anyway 
			if(!detectImplementationSyntax(args.context, 'alpha')) 
			{ 
				//and if no form of opacity is supported, set plusfade 
				//back to zero, so its conditions will subsequently fail
				args.plusfade = 0;  
				
				//however if the appname is "fade"
				//no support for opacity is a failure condition
				//so in that case call the fallback function, 
				//which does a basic swap 
				//resets this runningkey, then calls and returns; and we're done
				if(args.appname == 'fade') 
				{ 
					return fallback(args);
				}
			}

			//or if we have support 
			//set initial full opacity on the context element
			else 
			{ 
				stylefunctions.fade(args.context, 1); 
			}
		}


		//create an object for storing any additional transition data 
		//starting with the common stuff that most of them will need
		var transitprops = 
		{
			//we have to use offset dimensions even for images
			//because in some browsers (eg. Opera) the image properties 
			//.width and .height return the width and height attribute values, 
			//if they're set, even if CSS creates a different rendered size
			contextsize : {
				x : args.context.offsetWidth,
				y : args.context.offsetHeight
				},
				
			//the image transitions all create a copy of themselves
			//and this is what the animation is actually applied to;
			//however some transitions create multiple copies
			//so the process that creates them has to be iterative;
			//so this figure is how many to create, normally just one
			copies : 1
		};
		
		//then if this transition has a prefoo function, call it now, 
		//passing args and transitprops; currently only bars and slide
		//have these functions - prebars gets all the extra transitprops
		//data that the transition needs, and preslide works out 
		//how many copies to make and modifies the type accordingly
		//nb. changes to args and transitprops will affect the original objects
		//at this scope, since what we're sending are references not copies;
		//this is unique behavior of objects as function arguments, and is 
		//as confusing for those not expecting it, as it is useful to those who are :-)
		var prefunction = stylefunctions['pre' + args.appname];
		if(defined(prefunction))
		{
			prefunction(args, transitprops);
		}
		

		//define an addspan value by which transition this is 
		//which we'll use when creating the clones, and as part of their
		//dynamic repositioning routine with the animation instance callback
		var addspan = /^(slide|twist|skew)$/.test(args.appname),
		
		//now pass the context image and addspan value to the getRealPosition method
		//which returns the true position of the element, compensated for browser quirks
		//nb. we used to do this as part of addSuperImage, but since that gets run 
		//multiple times we were actually running the realposition process multiple 
		//times as well, which is totally wasteful and inefficient
		//and caused a greater lag at the start of the bars transition
		//only to be expected I suppose if you do something 63 unecessary times!
		realposition = getRealPosition(args.context, addspan);
		

		//create the newcontext array; then for each of the specified copies 
		//(we need a normal iterator here, so we can return from this scope)
		for(var newcontext=[], l=transitprops.copies, i=0; i<l; i++)
		{
			//copy the counter to transitprops so we can refer to it externally
			//[which we'll need to for a slide transition, but remember
			//that the value will only be updating during standby() calls - 
			//once we get to oninstance calls, it will just be a residual]
			transitprops.i = i;
			
			//work out which alt text and src to set on the super clone, 
			//according to appname and reverse -- as you'd expect, 
			//we mostly use the new alt text and src, unless this transition is:
			//	- any reverse that's not a slide
			//	- a forward quad slide
			//	- the 2nd image in a forward double-slide
			//	- the 1st image in a reverse single or double-slide 
			if
			(
				(args.appname != 'slide' && !args.reverse)
				|| 
				(
					args.appname == 'slide'
					&& 
					(
						(!args.reverse && (args.anitype == 'CC' || i == 0))
						||
						(args.reverse && (args.anitype != 'CC' && i == 1))
					)
				)
			)
			//new alt text and src
			{
				var 
				superalt = args.alttext, 
				supersrc = args.newcontext;
			}
			//original alt text and src
			else
			{
				var 
				superalt = args.context.alt,
				supersrc = args.context.src;
			}
			
			//create a superimposed blank clone image, 
			//passing the pre-saved realposition and addspan values
			//no src is set just yet, until it's been hidden with 
			//its transition property, so there's no chance of 
			//seeing a brief flash of visibility before it gets hidden
			newcontext[i] = addSuperImage(args.context, realposition, addspan);
			
			//if this is a transform transition (grow, twist or skew)
			if(/^(grow|twist|skew)$/.test(args.appname))
			{
				//detect and store the supported form of transform syntax, if necessary
				//and if no form of transform is supported, remove the clone
				//then call and return the fallback function
				if(!detectImplementationSyntax(newcontext[i], 'transforms')) 
				{ 
					remove(newcontext[i]);
					
					return fallback(args);
				}
			}
		
			//make the newcontext element hidden or visible [according to reverse]
			//with the appropriate transition property [according to methodname]
			//this will also set initial newcontext opacity if plusfade is active
			standby(newcontext[i], args, transitprops);

			//set the new or original src on the new image, as previously determined
			newcontext[i].src = supersrc;
		}
		

		//if reverse is true [we moved this here so it's outside
		//the iterator, since it only ever needs to happen once]
		if(args.reverse)
		{
			//immediately part-"finish" the original context image
			//by switching its src to the new value
			args.context.src = args.newcontext;
			
			//and updating its alt text (if specified)
			if(args.alttext != NULL_VALUE) 
			{ 
				args.context.alt = args.alttext;
			}
				
			//if plusfade is active, set the context's initial minimum opacity 
			//[1 minus fade strength, eg. 0.7 starts from 0.3, or 1 starts from 0 for a full fade]
			if(args.plusfade > 0)
			{ 
				stylefunctions.fade(args.context, (1 - args.plusfade)); 
			}
		}


		//get the /raw/ position of the context image, which we're going to use 
		//in the animation instance handler to re-position the clones in case of 
		//anything that causes the underyling image position to change, like window resizing
		//but we only need rough positions to be able to detect the difference
		//and since that process is very quick, it's not a worry to have to do it every iteration
		//(though it's possible, but highlighy unlikely, that a movement will be caused 
		// by dynamic CSS changes that don't show up in the rough position!)
		var rawposition = getRawPosition(args.context),

		//then create a copy of the newcontext array, saving the outer span reference
		//for each clone that's using one, otherwise saving the image itself
		//(ie. saving whichever has the positioning applied to it)
		//we'll need this for iteratively repositioning the clones if that proves necessary
		//and is much more efficient to save like this than compile on demand
		clones = [];
		forevery(newcontext, function(i, clone) 
		{ 
			clones.push(addspan ? clone.parentNode : clone); 
		});


		//then if this is not a "bars" or "slide" transition, 
		//copy the single newcontext member back to newontext as a single object, 
		//which is what all the other property-application functions are expecting
		//(only bars and slide have to deal with multiple objects)
		//nb. there's no point excluding this with a processing comment condition
		//because it would have to include 'fade', and fade is always included
		if(!/^(bars|slide)$/.test(args.appname))
		{ 
			newcontext = newcontext[0]; 
		}


		//create a counter
		var counter = 1, 

		//define a timer instance callback
		oninstance = function(aniresolution, timersteps)
		{
			//before we do anything else, check that the position of the context image hasn't changed
			//by re-getting its raw position and comparing it with the stored position
			var currentrawposition = getRawPosition(args.context);

			//then only if that quick process indicates a difference ...
			if(currentrawposition.x != rawposition.x || currentrawposition.y != rawposition.y)
			{
				//run the more lengthy process of getting the true position of the original image
				//then iterate through the clones and re-position each one to match
				//nb. pass false for the position function's addspan argument, so that the 
				//inner images' position resets don't get applied again (which would be unecessary)
				var realposition = getRealPosition(args.context, addspan);
				forevery(clones, function(i, clone)
				{
					positionSuperImage(clone, args.context, realposition, BOOLEAN_FALSE);
				});	
				
				//update the rawposition object
				//otherwise this will happen on every iteration from now on
				rawposition = currentrawposition;
			}
			
			
			//reduce the counter by one resolution bit
			counter = counter - (1 / aniresolution);

			//call the relevant property-application function, according to appname
			//unless the appname is "fade" (we don't need to do anything here to 
			//implement fade, it's taken care of by plusfade conditions alone)
			//we pass the function a unified local arguments collection
			//in which newcontext is either an object, or an array of objects, 
			//according to the method (which will know what to expect itself!)
			if(args.appname != 'fade')
			{
				stylefunctions[args.appname](
					newcontext, 
					args.anitype, 
					counter, 
					transitprops, 
					args.reverse
					);
			}
		
			//if plusfade is true, apply opacity to the context
			//and inverse opacity to the new context(s) for !reverse/positive;
			//or the other way round for reverse/negative
			//tempering the total fade amount according to the plusfade value
			if(args.plusfade > 0)
			{
				//pre-compute before applying, to save repetition
				var fadeout = ((1 - args.plusfade) + (args.plusfade * counter)),
					fadein = ((1 - args.plusfade) + (args.plusfade * (1 - counter)));

				//nb. we generally work with the reverse argument as (!args.reverse)
				//rather than (args.reverse), because not being in reverse is the norm
				stylefunctions.fade(args.context, !args.reverse ? fadeout : fadein);
				stylefunctions.fade(newcontext, !args.reverse ? fadein : fadeout);
			}
		},
		
		//and a timer completion callback
		oncomplete = function()
		{
			//finish the context element, 
			//passing fadesyntax if plusfade > 0, else "none"
			//(the finish function uses the "none" value to mean 
			//"don't apply fade" rather than "fade isn't supported"
			//and this allows us to define whether or not we want fade
			//without also having to check whether fade is supported)
			//this function will do everything else we need to finish off the transition:
			//the final image swap, resetting opacity on both
			//(according to plusfade), and resetting the running key;
			//it can handle newcontext either as a single element or an
			//array of elements, so we don't even need to discriminate by appname :-)
			finish(
				newcontext, 
				args, 
				(args.plusfade > 0 ? impsyntax.alpha : NO_SYNTAX_KEY)
				);

			//if a user callback function was specified, call it now
			if(args.oncomplete != NULL_VALUE) { args.oncomplete(); }
		};
		
		
		//and finally ... start a controlled timer to kick everything off
		//passing the duration and both the callbacks
		doControlledTimer(args.duration, oninstance, oncomplete);
		
		
		//return true for success
		return BOOLEAN_TRUE;
	}
	
	
	//master cache function, ditto
	//(the "do" prefix is so we can compress the name without affecting this.cache)
	function docache(args)
	{
		//if images are disabled in the browser, 
		//just return false for failure and we're done
		if(!detectImageSupport()) { return BOOLEAN_FALSE; }
		
		
		//if debug mode is true, validate all the arguments
		if(defined(debug)) { args = argvalidate(args, 'cachekeys'); }
		
		
		//create an array of cached images
		//we have to have separate references so that 
		//multiple requests can overlap without cancelling
		//and by deleting from the input array once cached
		//we'll know when they're all cached to call oncomplete
		var cachedimages = [],
		
		//copy the input image array so we don't affect the original
		//[because args.arrayarg is a reference, not a copy]
		imagearray = [];
		forevery(args.arrayarg, function(i, imagearg)
		{ 
			imagearray[i] = imagearg; 
		});
		
		//run through the input array
		forevery(imagearray, function(i, imagearg)
		{
			//unless this value returns undefined...
			//(which caters for IE with members creating by a trailing-comma)
			if(defined(imagearg))
			{
				//trim this value and only proceed if it's not empty 
				imagearg = trim(imagearg);
				if(imagearg !== '')
				{
					//create a new cached image object
					//with an _i property so that we can 
					//refer to the index from its load handler
					cachedimages[i] = new Image;
					cachedimages[i].__i = i;
					
					//private handler function for onload/onerror response
					function handler(imageindex)
					{
						//clear the image array value at the index point
						//we can't splice it because that will throw out the indices
						//so setting an empty string means we can check once they've all
						//been done, because ary.join('') would then be any empty string
						imagearray[imageindex] = '';
						
						//so if the array is now empty, and we have a callback, call it now
						//passing the (now populated) cachedimages array, which the user 
						//can also compare against to determine which images failed to load
						//because those members will be null rather than an image object
						//nb. this empty-string test means that trailing empty members are ignored
						//(when validation isn't used -- validation will throw an error for that)
						if(imagearray.join('') == '' && args.oncomplete != NULL_VALUE)
						{
							args.oncomplete(cachedimages);
						}
					}
					
					//now create the load handler
					cachedimages[i].onload = function()
					{
						//call the handler with this image's index
						handler(this.__i);
					};
					
					//also create an error handler for broken paths
					cachedimages[i].onerror = function()
					{
						//nullify the object in cachedimages
						cachedimages[this.__i] = NULL_VALUE;
						
						//call the handler with this image's index
						handler(this.__i);
					};
					
					//then we can set the src to try to pre-load this image
					cachedimages[i].src = imagearg;
				}
			}
		});
		

		//if we get here then return true for success
		//when images are enabled this will return long before 
		//the images have finished pre-loading, since that's asynchronous
		return BOOLEAN_TRUE;
	}


	//master define function, ditto and ditto (and ditto :-))
	function dodefine(args)
	{
		//if debug mode is true, validate all the arguments
		if(defined(debug)) { args = argvalidate(args, 'definekeys'); }
		
		//save the value to user config
		userconfig[args.namearg] = args.valuearg;
		
		//if the option is "base-zindex" we also have to 
		//update the super_layout_properties dictionary
		//which we may as well just do every time, 
		//since it does no harm and saves us the condition!
		SUPER_LAYOUT_PROPERTIES.zIndex = userconfig['base-zindex'];
		
		//return true for success
		return BOOLEAN_TRUE;
	}
	
	
	

	
	//-- private methods [argument pre-processing] --//

	//process a named method's arguments array to create an indexed object
	//this is primarily because it's easier to refer to them within an object
	//since we can do variable replacement on the keys, and so forth;
	//it also makes it possible for users to omit any number of intermediate 
	//optional arguments, and have the oncomplete callback be the last one
	function argprocess(appname, argcollection, keysindex)
	{
		//for the fade method we first need to insert some dummy arguments
		//at the applicable indices in the arguments array
		//to moderate the data so that it's all consistent and validates
		if(appname == 'fade')
		{
			//argcollection is the arguments collection, which is not an array
			//so before splicing it we'll have to convert it to an array
			//(we could do that when we pass it in, but it would be wasted process elsewise)
			argcollection = makearray(argcollection);

			//anitype [4] can by any dummy value since it won't ever be used
			//but i'll make it empty string to keep the data-type consistent
			//plusfade [5] is set to 1 so we can leverage 
			//the plusfade functionality to implement the fade 
			//reverse [6] is set to false because it's meaningless to a fade
			argcollection.splice(4,0, 	'', 1, BOOLEAN_FALSE);
		}
		
		//create an indexed arguments object, starting with the appname
		var args = { appname: appname };
		
		//now run through the argument keys array referred to by the keysindex
		forevery(ARGUMENT_KEYS[keysindex], function(i, argkey)
		{
			//as soon as we encounter a function within the arguments collection
			//nullify all subsequent arguments then index the function to args.oncomplete 
			//nb. this assumes that oncomplete is the only function-type argument (which it is)
			if(typeof argcollection[i] == 'function')
			{
				for(var j=i; j<ARGUMENT_KEYS[keysindex].length; j++)
				{
					args[ARGUMENT_KEYS[keysindex][j]] = NULL_VALUE;
				}
				args.oncomplete = argcollection[i];
				
				//return [anything, but something] to break forevery
				return BOOLEAN_FALSE;
			}
			
			//otherwise if this argument is undefined
			//create a null value at the corresponding index in the arguments object
			//subsequent processes will then use this null value to identify
			//that it's an undefined optional argument, or a missing required argument
			//(be nice if we had two different "null" values, then we could differentiate 
			// between missing and required; but as it is, it's not worth the complication 
			// of having specific values to identify status rather than simple value|null comparisons)
			if(!defined(argcollection[i]))
			{
				args[argkey] = NULL_VALUE;
			}
			
			//or if the argument is defined then add it 
			//to the args object using the applicable index
			else
			{
				args[argkey] = argcollection[i];
			}
		});
		
		//return the arguments object
		return args;
	}
	
		
	//process raw argument values and set defaults for any that are undefined
	//from a processed args object in which undefined values have already been pre-set to null
	//we also use this to set the necessary default values for fade
	//(which has a different range of arguments)
	function argprepare(args)
	{
		//if context is a string ID beginning with "#", convert it to an object reference
		if(typeof args.context == 'string' && /^#/.test(args.context))
		{
			args.context = document.getElementById(args.context.substr(1));
		}
		
		//convert the duration to a float, convert to ms, and limit to minimum
		//it could be said that enforcing a minimum is a job of validation
		//but I don't want that to be a failure condition, because the 
		//practical minimum is also a factor of user configuration; and anyway, 
		//far more the point, validation is not be present in the production version
		//so we'll just implement a floor with whatever we get
		//and if it's still NaN, that will be caught by validation, when present
		args.duration = parseFloat(args.duration) * 1000;
		
		var minspeed = (1 / userconfig['step-resolution']) * 4000;
		if(args.duration < minspeed) 
		{ 
			args.duration = minspeed; 
		}
	
		//if type is not null, convert it to an uppercase string;
		//then if the type is "RND", grab a random type from the 
		//applicable array -- each transform-related appname has its own 
		//types array, except for "grow", which shares the "wipe" array
		if(args.anitype != NULL_VALUE) 
		{ 
			args.anitype = args.anitype.toString().toUpperCase(); 
			
			if(args.anitype == 'RND') 
			{ 
				var typesarray = ANIMATION_TYPES[args.appname == 'grow' ? 'wipe' : args.appname];
				args.anitype = typesarray[Math.floor(Math.random() * typesarray.length)]; 
			}
		}
		
		//if plusfade is null set it to zero [default]
		//otherwise process its value, which can either be a percentage
		//or a string or numeric float between 0 and 1
		//and either way, we want to produce that float at the end
		//nb. the reason this code is not included in the compiled fade-only codebase 
		//even though we leverage plusfade to implement the fade, is that 
		//no process of the value will be required, because we've set the value
		//manually to 1, which is already in the format this process creates
		if(args.plusfade == NULL_VALUE)
		{
			args.plusfade = 0;
		}
		else
		{
			if(/\%$/.test(args.plusfade.toString()))
			{
				args.plusfade = parseInt(args.plusfade, 10) / 100;
			}
			args.plusfade = parseFloat(args.plusfade);
		}
		
		//if reverse is null set it to false [default]
		//otherwise determine its value (as a boolean), 
		//which we either recognise as trueish, or its false
		//nb. the brackets around "true" are to protect it from compression 
		if(args.reverse == NULL_VALUE)
		{
			args.reverse = BOOLEAN_FALSE;
		}
		else
		{
			args.reverse = /^1|y|yes|(tr)(ue)|\-$/i.test(args.reverse.toString());
		}
		
		//return the modified args
		return args;
	}
		




	//-- private methods [transition style and filter implementations] --//

	//these are stored in an object so we can refer to them by appname
	//the "foo" functions are called by the transition function
	//(and have appnames which match the the original public method)
	//whereas the "setbar" functions are only called indirectly, by "foo" functions,
	//(and their names just reflect what they do, they're not used as tokens)
	//not all transitions have both - we use both when the property setting 
	//has multiple implementation forks [like twist->setrotate, using "-vendor-transform"], 
	//in those cases, "foo" determines what to set and "setbar" actually sets it; 
	//but when browsers use the same implementation [like wipe, using "clip"] 
	//then it all happens in "foo" and we don't need a separate "setbar" function;
	//"prefoo" does any extra data preparation, for a couple of transitions that need that;
	//nb. the "setbar" function names can safely be compressed, but not so the 
	//"foo" and "prefoo" names, because those are dynamically referenced using values
	//that derive from public names, eg. "bars" leads to "prebars"	then "bars"
	var stylefunctions = {};


	//set opacity on an element using the supported syntax
	stylefunctions.fade = function(contextarg, counter)
	{
		//if contextarg is not an array, create an array from it
		//[it will usually be a single object, but may be an array of objects,
		// so this evens-out that difference ready for iteration]
		if(!(contextarg instanceof Array)) { contextarg = [contextarg]; }
		
		//then run through that array, of one or more contexts
		forevery(contextarg, function(i, context)
		{
			//not if the context is null
			//which can happen with a slide transition
			if(context != NULL_VALUE)
			{
				//for IE's filter syntax
				if(impsyntax.alpha == MS_SYNTAX_KEY) 
				{ 
					//initialise this element's filters, if necessary
					//which we have to do every time before we can 
					//refer to specific filters in the collection
					//original I was just writing to style.filter each time
					//and that didn't require a pre-existing value to work
					//but it did preclude the possibility of using multiple filters
					//on the same element, because setting style.filter will 
					//of course overwrite anything already set on style.filter 
					//(it's also less efficient than object access, according to MSDN)
					//we're checking for a specific filter, rather than just whether
					//the filters collection is empty, just in case the user
					//has already defined this or a different filter on the element
					//(which unfortunately will now be lost, but that can't easily be helped)
					//so in fact we could use either of the filters we use in this library 
					//for this test, doesn't have to be the alpha filter; but equally may as well be
					if(!defined(context[MS_SYNTAX_KEY][MS_ALPHA_FILTER]))
					{ 
						filterInit(context); 
					}
					
					//set the specified opacity
					context[MS_SYNTAX_KEY][MS_ALPHA_FILTER].opacity = counter * 100;
				}
				
				//for others that have fade support 
				else
				{ 
					//unless this is konqueror, restrict maximum opacity to just below zero
					//this prevents a visual popping effect in some legacy implementations
					//however when applied in konqueror it makes the image turn black!
					context.style[impsyntax.alpha] = counter == 1 ? 0.9999999 : counter; 
				}
			}
		});
	};


	//compute and apply clip for an element 
	//to implement a wipe transition of a specified type 
	//nb. whereas fade() and scale() just apply input settings
	//this one computes what to do first, with various branches
	//which is why it's called wipe() and not clip()
	//we don't need a finer abstraction just for setting clip itself
	//because all browsers use the same syntax; but this and the bars abstraction 
	//still does put all instances of style.clip in one place, which is helpful
	//nb. this is why we need this function for the compiled "bars" script as well
	//but we only need the first two conditions, the third is just for wipe transitions themselves
	stylefunctions.wipe = function(contextarg, anitype, counter, transitprops, reversearg)
	{
		//if the input counter is 0, apply zero clip
		//to make the element completely hidden
		if(counter == 0)
		{ 
			contextarg.style.clip = 'rect(0,0,0,0)'; 
		}
		
		//or if it's 1 apply full clip 
		//we have to use this syntax because the proper value 
		//(just clip="auto") doesn't work in IE6-7
		//[it throws "invalid argument" when set through scripting]
		else if(counter == 1) 
		{ 
			contextarg.style.clip = 'rect(auto,auto,auto,auto)'; 
		}
		
		//otherwise we're applying values for a wipe transition
		//(and the counter will be between 0 and 1)
		else
		{
			//for normal transitions the increment is (counter)
			//for reverse transitions it's (1 - counter)
			var excrement = !reversearg ? counter : (1 - counter),
			//(cos excrement is the opposite of increment ... geddit :-D)

			//pre-compute some other values we use several times, 
			//which garners a speed and code size improvement
			//(especialy in reducing exccessive parenthesise!)
			//though it does cost a little more memory
			cx = transitprops.contextsize.x,
			cy = transitprops.contextsize.y,
			xi = cx * excrement,
			yi = cy * excrement;
	
			//compute and apply the clip 
			contextarg.style.clip = 'rect('
				+ (
					/^B[LRC]?T/.test(anitype) 			//(BT|BLTR|BRTL|BCTC)
						? yi 
						: /^[CM][HCRL]/.test(anitype) 	//(CHE|CC|MLRC|MRLC)
							? yi / 2
							: 0 
					)
				+ 'px,'
				+ (
					/^[TBM]?L/.test(anitype) 			//(LR|TLBR|BLTR|MLRC)
						? cx - xi 
						: /^[CTB][VC]/.test(anitype) 	//(CVE|CC|TCBC|BCTC)
							? cx - (xi / 2)
							: cx 
					)
				+ 'px,'
				+ (
					/^T[LRC]?B/.test(anitype) 			//(TB|TLBR|TRBL|TCBC) 
						? cy - yi 
						: /^[CM][HCRL]/.test(anitype) 	//(CHE|CC|MLRC|MRLC)
							? cy - (yi / 2)
							: cy 
					)
				+ 'px,'
				+ (
					/^[TBM]?R/.test(anitype)			//(RL|TRBL|BRTL|MRLC)
						? xi
						: /^[CTB][VC]/.test(anitype) 	//(CVE|CC|TCBC|BCTC)
							? xi / 2
							: 0
					) 
				+ 'px)';
		}
	};


	//bars transition pre function adds the data needed for a bars transition, 
	//to input args and transitprops objects [and since they're 
	//references not copies, we don't need to return them again
	//the changes we make to them here will affect the original]
	stylefunctions.prebars = function(args, transitprops)
	{
		//split the type into number of bars and directional type
		//saving the bar count to transitprops [converted to an integer]
		//and returning the pure type back to args.anitype
		args.anitype = args.anitype.replace(/^([0-9]+)([a-z]+)$/i, function(a,b,c)
		{
			transitprops.barcount = parseInt(b, 10);
			return c;
		});

		//record whether this is a 1D [or 2D] transition; and whether it's a
		//horizontal or vertical checkerboard transition [which is also a 2D transition]
		transitprops.is1D = /^[LTRBC][LRTBVH][E]?$/.test(args.anitype);	//(LR|RL|TB|BT|CVE|CHE)
		transitprops.isHSQ = /^S[LRC][LRV]/.test(args.anitype);			//(SLR|SRL|SCVE)
		transitprops.isVSQ = /^S[TBC][TBH]/.test(args.anitype);			//(STB|SBT|SCHE)
		
		//compute and save the width and/or height of each bar
		//[from the number of bars and the image dimensions]
		//one-dimensional transitions have a line of n pieces
		//eg. 8 vertical strips for an "8LR" transition
		//and only the x or y value is used, the other dimension is full size;
		//two-dimensional transitions have an (n x n) grid of pieces
		//eg. 8 x 8 pieces for an "8TLBR" transition
		//and both values are applied to the pieces
		transitprops.barsize = {
			x : transitprops.contextsize.x / transitprops.barcount,
			y : transitprops.contextsize.y / transitprops.barcount
			};
		
		//and for multi-centered transitions we also need to set barsize divisions 
		//which are further shortcuts for compacting the clip-compiling conditions
		//eg. "CVE" bars expand to the left and right from a regional center, 
		//so the total movement in each direction is (barsize.x / 2)
		//and that division [2 [or 1]] is the value of barsplit
		transitprops.barsplit = {
			x : /^[STB]?[C][VCBT]/.test(args.anitype) ? 2 : 1,	//(CVE|CC|SCVE|TCBC|BCTC)
			y : /^[S]?[C][HC]|M/.test(args.anitype) ? 2 : 1		//(CHE|CC|SCHE|MLRC|MRLC)
			};
		
		//if there are 16 bars or fewer, round-up the barsize values --  
		//this forces them into the pixel grid, rather than the sub-pixel grid,
		//and thereby reduces "pixel wobble"; we round up rather than down 
		//so that we don't create a gap at the end; we don't do this for larger
		//numbers of bars because it destroys the psychedelic effects they create!
		//I got the idea for doing this while researching pixel rounding errors
		//http://ejohn.org/blog/sub-pixel-problems-in-css/#comments
		if(transitprops.barcount <= 16)
		{
			transitprops.barsize.x = Math.ceil(transitprops.barsize.x);
			transitprops.barsize.y = Math.ceil(transitprops.barsize.y);
		}
				
		//we need to create one superimposed clone for each bar
		//[1D transitions specify the number of bars
		// 2D transitions specify the square-root of the number of bars]
		//they're all stacked perfectly on top of each other
		//so each bar is simply a clipping region of the original
		//(just like multiple wipes, which is what they are!)
		transitprops.copies = Math.pow(transitprops.barcount, (transitprops.is1D ? 1 : 2));
		
		//for a checkerboard transition we're staggering the bars
		//in odd-numbered rows or columns, 
		//so for horizontal, each row will need one extra bar
		//and for vertical we'll need one extra row
		if(transitprops.isHSQ) 
		{ 
			transitprops.copies += Math.floor(transitprops.barcount / 2); 
		}
		else if(transitprops.isVSQ) 
		{ 
			transitprops.copies += transitprops.barcount; 
		}
	};

	//compute and apply clip for a whole bunch of overlaid elements
	//to implement a bars transition of a specified type 
	stylefunctions.bars = function(contextarg, anitype, counter, transitprops, reversearg)
	{
		//if this is a 2d transition type we need square-coordinate counters [a,b]
		//to work out the dimensions of each clipping region in the grid
		//and we need an array for recording all the clip values
		//because we're going to iterate once to compute them all, then iterate again
		//to actually apply them, which [theoretically] reduces the potential for "wobble" 
		//because the clips get applied as close together as possible:
		//the second loop should iterate faster because it has less work to do;
		//but in reality, it doesn't atually seem to make a noticeable difference!
		//I'm not gonna change it now though, cos it certainly isn't making it worse!
		var a = 0, b = 0, clipvalues = [],
		
		//for normal transitions the increment is (counter)
		//for reverse transitions it's (1 - counter)
		increment = !reversearg ? counter : (1 - counter),

		//pre-compute some other values we use several times, 
		//which garners a speed and code size improvement, 
		//(especialy in reducing exccessive parenthesise)
		//though it does cost a little more memory
		zx = transitprops.barsize.x,
		zy = transitprops.barsize.y,
		xi = (zx / transitprops.barsplit.x) * increment,
		yi = (zy / transitprops.barsplit.y) * increment;
		
		//if there are 16 bars or fewer, round-up the values (see prebars for details)
		if(contextarg.length <= 16)
		{
			xi = Math.ceil(xi);
			yi = Math.ceil(yi);
			
			//and set a flag to do some more of this later
			var roundup = BOOLEAN_TRUE;
		}
			
		//run through the newcontext bars and record this element's clip values
		//according to type and number and its position in the stack
		forevery(contextarg, function(i)
		{
			//we use x,y as shortcuts to i,i [for 1D] or a,b [for 2D] 
			//so we can compile the clip with fewer conditions
			//[half of which would otherwise only express that difference]
			var x = transitprops.is1D ? i : a,
				y = transitprops.is1D ? i : b,
			
			//set the stagger value for a checkerboard transition,
			//to reduce the clip for odd-numbered rows or columns by half the barsize 
			//(the left/right clip for horizontal, or the top/bottom clip for vertical)
			//the beauty of this is that, for the pieces which are half-staggered
			//outside the overall image area, we won't ever get any unwanted overflow -- 
			//even though the clipping region extends half-outside, there's nothing 
			//to see, because it refers to co-ordinates that are outside the image :-)
			stagger = 
			{
				x : (transitprops.isHSQ && (Math.floor(b / 2) < b / 2)) 
						? zx / 2 
						: 0,
				y : (transitprops.isVSQ && (Math.floor(a / 2) < a / 2)) 
						? zy / 2 
						: 0
			},
				
			//pre-compute some more values, those which had to wait until now
			//because they need the values for x, y and/or stagger
			bx = zx * x,
			by = zy * y,
			sx = bx - stagger.x,
			sy = by - stagger.y;

			//if there are 16 bars or fewer, round-up the values (see prebars for details)
			if(defined(roundup))
			{
				bx = Math.ceil(bx);
				by = Math.ceil(by);
				sx = Math.ceil(sx);
				sy = Math.ceil(sy);
			}
			
			//calculate the clip values and store them as a single output-ready string
			clipvalues[i] = 'rect('
				+ ( 
					/^T[LRCB]|S[LRTC][LRBV]/.test(anitype)				//(TB|TLBR|TRBL|SLR|SRL|STB|SCVE|TCBC)	
						? sy
						: /^[BS]?[BLRC][HCT]|M/.test(anitype)			//(BT|BLTR|BRTL|SBT|CHE|CC|SCHE|BCTC|MLRC|MRLC)
							? sy + yi
							: 0 
					)
				+ 'px, ' 
				+ ( 
					/^[TBSM]?[LC][VRTBC]/.test(anitype)					//(LR|TLBR|BLTR|SLR|CVE|CC|SCVE|TCBC|BCTC|MLRC)
						? (zx * (x + 1)) - stagger.x - xi
						: /^[TBSM]?[R][LTB]|S[TBC][TBH]/.test(anitype)	//(RL|TRBL|BRTL|SRL|STB|SBT|SCHE|MRLC)
							? sx + zx 
							: transitprops.contextsize.x 
					) 
				+ 'px, ' 
				+ ( 
					/^[TS]?[TLRC][BHC]|M/.test(anitype)					//(TB|TLBR|TRBL|STB|CHE|CC|SCHE|TCBC|MLRC|MRLC)
						? (zy * (y + 1)) - stagger.y - yi
						: /^B[TLRC]|S[LRBC][RLTV]/.test(anitype)		//(BT|BLTR|BRTL|SLR|SRL|SBT|SCVE|BCTC)
							? sy + zy
							: transitprops.contextsize.y
					)
				+ 'px, ' 
				+ ( 
					/^[TBMS]?[L][RBT]|S[TBC][TBH]/.test(anitype)		//(LR|TLBR|BLTR|SLR|STB|SBT|SCHE|MLRC)
						? sx
						: /^[TBSM]?[RC][VLTBC]/.test(anitype)			//(RL|TRBL|BRTL|SRL|CVE|CC|SCVE|TCBC|BCTC|MRLC)
							? sx + xi 
							: 0
					) 
				+ 'px)';
				
			//update the square counters
			//which works differently for horizontal checkerboard transitions
			//because they have one extra bar in each odd-numbered row 
			//[vertical squares simply have a whole extra row [if we tried to have uneven
			// columns we'd end up with some a,b indices referring to non-existent bars;
			// which we could deal with of course, but it's just more stuff to deal with!]]
			if(++a == (transitprops.barcount + (stagger.x > 0 ? 1 : 0))) 
			{ 
				a = 0; 
				b ++; 
			}
		});
		
		//now iterate again and apply the saved clip values
		//I'm using this construct for the marginal speed improvement,
		//though arguably not worth it, I'm just trying to scrape 
		//every last microsecond of performance out of this
		//(and it does make a slight but genuine difference)
		var i=0, l=contextarg.length;
		do
		{
			contextarg[i].style.clip = clipvalues[i];
		}
		while(++i < l);
	};


	//configure and apply scale() for an element
	//to implement a grow transition of a specified type
	stylefunctions.grow = function(contextarg, anitype, counter, transitprops, reversearg)
	{
		//if the input counter is 0 or 1, set either zero, or full scaling,
		//to make it completely hidden or visible, respectively
		if(counter == 0 || counter == 1)
		{
			stylefunctions.setscale(contextarg, transitprops.contextsize, [counter,counter], [0,0]);
		}
		
		//otherwise we're applying values for animation
		else
		{
			stylefunctions.setscale(contextarg, transitprops.contextsize, 
				
				//scale[x,y] (according to type; see scale() for details)
				//for normal transitions the increment is (1 - counter)
				//which amounts to an increasing number (since counter goes down)
				//for reverse transitions it's just counter, so it's a decreasing number
				[
					/^TB|BT|CHE$/.test(anitype) ? 1 : !reversearg ? (1 - counter) : counter
					,
					/^LR|RL|CVE$/.test(anitype) ? 1 : !reversearg ? (1 - counter) : counter
				],
				
				//origin[x,y] (ditto)
				[
					/^[TBM]?[R][LTB]/.test(anitype)				//(RL|TRBL|BRTL|MRLC)
						? 1
						: /^[TBM]?[LTB][RTB]|CH/.test(anitype)	//(TLBR|LR|TB|BT|BLTR|CHE|MLRC)	
							? 0									// and would match (BRTL|TRBL) except they've already passed the first condition
							: 0.5								// which is why the conditions are in this order -- it makes for a simpler regex
				,
					/^[B][TLRC]/.test(anitype)					//(BT|BLTR|BRTL|BCTC)
						? 1
						: /^[TC]?[LRTVC][RLBE]/.test(anitype)	//(TLBR|LR|TB|RL|TRBL|CVE|TCBC)
							? 0
							: 0.5
				]);
		}
	};
	
	//set scale on an element using the supported transform syntax 
	//scale[x,y] values are proportions of horizontal/vertical scaling, from 0 to 1 
	//origin[x,y] is origin extents, amounting to: 0=left/top, 1=right/bottom, 0.5=center/middle
	//and from that data we compute two ways of applying the scale, according to syntax
	//(finer granularity is also supported, eg. [0.7,0.2] to make "70% 20%", but we're not 
	// actually extending that granularity to user input atm, it was just the best way to design it)
	stylefunctions.setscale = function(contextarg, contextsize, scalearg, originarg)
	{
		//for IE's filter syntax
		if(impsyntax.transforms == MS_SYNTAX_KEY) 
		{ 
			//initialise this element's filters, if necessary [see fade() for notes]
			if(!defined(contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER]))
			{ 
				filterInit(contextarg); 
			}

			//apply a matrix transform to do the scale
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M11 = scalearg[0];
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M22 = scalearg[1];
			
			//we have to work out the origin as x,y offsets from the top-left 
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].Dx = ((1 - scalearg[0]) * contextsize.x) * originarg[0];
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].Dy = ((1 - scalearg[1]) * contextsize.y) * originarg[1];
		}
		
		//for others that have transform support 
		else
		{ 
			//apply the scale 
			contextarg.style[impsyntax.transforms] = 'scale(' + scalearg[0] + ',' + scalearg[1] + ')';
			
			//the origin is specified like background-position values, eg "100% 0" for "right top"
			contextarg.style[impsyntax.transforms + ORIGIN_SYNTAX] = (originarg[0] * 100) + '%\ ' + (originarg[1] * 100) + '%';
		}
	};	


	//configure and apply rotate() for an element
	//to implement a twist transition of a specified type
	//nb. for some inexplicable reason, when reversearg was 
	//the 3rd rather than 4th argument (and ==false, with a "TLC" twist) 
	//we'd get a momentary flash of the newcontext image with 0 rotation 
	//before snapping back to -90 and doing the rotation to 0, as it should
	//so for consistency I've made reversearg always the last argument
	//to each transitprop-application function that uses it
	stylefunctions.twist = function(contextarg, anitype, counter, transitprops, reversearg)
	{
		//invert the counter reset values (0 = 1, 1 = 0)
		//which is what they need to be to effect the start and end rotation points
		counter = counter == 1 ? 0 : counter == 0 ? 1 : counter;
		
		//copy the contextsize properties from transitprops to a new object
		//which we need for IE's transform-origin calculations
		//and we have to grab again and pass independently to rotate()
		//because if we pass transitprops.contextsize, modifying it
		//as an argument value within rotate gives a constantly changing value
		//rather than a value which is only changed once;
		//not 100% sure why this is, but I think it's to do with
		//the reference being live and affected by live changes, 
		//which happens via the constant rotation, which we're then modifying again,
		//which updates the live reference again ... and so on in a vicious circle. 
		//But we don't actually need to read fresh values from contextarg again,
		//we can just copy them from transitprops and go from there - indeed, 
		//that's better, because when counter is 0 (called from standby())
		//the image src won't have been set yet, and some browsers will only return
		//the rendered size of the alt text, not the size of the image!
		//though in fact IE isn't one of those browsers ... still it's good to be 
		//accurate [and when we do this same thing in skew(), it matters there,
		//because all browsers are making use of the figures, not just IE]
		var contextsize = {
			x : transitprops.contextsize.x,
			y : transitprops.contextsize.y
			},
			
		//define the base angle, based on orientation:
		//180deg for center or middle orientations, or 90deg for corner orientations;
		//but we're actually using a pre-converted constant in radians 
		//[90 degrees == 1.5707963267948966 radians]
		//because we need radians for IE's Math stuff anyway, and other browsers 
		//are happy using them for their transforms, so we may as well save 
		//ourselves the work of conversion and use them for everyone
		baseangle = anitype.charAt(1) == 'C' || anitype.charAt(0) == 'M' 
					? RIGHT_ANGLE * 2 
					: RIGHT_ANGLE,
						
		//then calculate the degree of change 
		//from that angle and the counter value
		degree = (1 - counter) * baseangle;
		
		//apply the values to reset or animate a rotational transform
		//reset applies the base angle (or zero for reverse) when counter=1
		//and it transitions to zero (or base angle for reverse) when counter=0
		stylefunctions.setrotate(contextarg, contextsize, 
			
			//angle (according to type; see rotate() for application)
			//clockwise rotations start with a negative angle
			//that increases to zero; vice versa for anti-clockwise;
			//reverse-clockwise rotations start with zero and decrease
			//to a negative angle; and vice versa for reverse-anti-clockwise
			anitype.charAt(2) == 'C'
				? !reversearg ? -baseangle + degree : 0 - degree
				: !reversearg ? baseangle - degree : degree
			, 

			//origin[x,y] (ditto)
			//right orientations are [1,y], left are [0,y], center are [0.5,y]
			//bottom orientations are [x,1], top are [x,0], middle are [x,0.5]
			//the order of these arguments is consistent with the other methods
			//and reflects the order I did them in, for my own head's sake :)
			[
				anitype.charAt(1) == 'R' ? 1 : anitype.charAt(1) == 'L' ? 0 : 0.5
				,
				anitype.charAt(0) == 'B' ? 1 : anitype.charAt(0) == 'T' ? 0 : 0.5
			]
			);
	};
	
	//set rotate on an element using the supported transform syntax 
	//angle is the angle of rotation, between +/-90 and 0 (pre-converted to radians)
	//origin[x,y] is origin extents, and works the same was as setscale()
	stylefunctions.setrotate = function(contextarg, contextsize, anglearg, originarg)
	{
		//save some shortcuts vars, to make the equations easier to follow
		var a = anglearg, 
			ox = originarg[0],
			oy = originarg[1],
			x = contextsize.x, 
			y = contextsize.y;

		//for IE's filter syntax
		if(impsyntax.transforms == MS_SYNTAX_KEY) 
		{ 
			//initialise this element's filters, if necessary [see fade() for notes]
			if(!defined(contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER]))
			{ 
				filterInit(contextarg); 
			}

			//compute the matrix for a rotational transform
			var c = Math.cos(a), 
				s = Math.sin(a),
				m11 = c,
				m12 = -s,
				m21 = s,
				m22 = c;
			
			//apply the matrix filter
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M11 = m11;
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M12 = m12;
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M21 = m21;
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M22 = m22;

			//now we must work out the origin as x,y offsets, as we did for scale
			//but this time the maths involved is rather more complex...
			//[I confess, it took me a whole day to work all this out, 
			// so don't go expecting any fancier transforms than this!]
			
			//calculate the dimensions of the relevant triangle(s), 
			//according to origin, then use them to work out the offsets
			var dx = 0, 
				dy = 0;
			
			//we implement origin granularity 
			//simply by making the dimensions proportionate with it
			//just as though it were a smaller box
			x *= ox;
			y *= oy;
				
			//right orientations
			if(ox > 0 && oy == 0)
			{
				dx = x - (Math.cos(a) * x);
				dy = 0 - (Math.sin(a) * x);
			}
			//bottom orientations
			else if(ox == 0 && oy > 0)
			{
				dx = Math.sin(a) * y;
				dy = y - (Math.cos(a) * y);
			}
			//right and bottom orientations
			else if(ox > 0 && oy > 0)
			{
				dx = (x + (Math.sin(a) * y)) - (Math.cos(a) * x);
				dy = 0 - (((Math.cos(a) * y) + (Math.sin(a) * x)) - y);
			}
			//left and top orientations don't need offseting

			//apply the offsets 
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].Dx = dx;
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].Dy = dy;
		}
		
		//for others that have transform support 
		else
		{ 
			//much easier :O)
			contextarg.style[impsyntax.transforms] = 'rotate(' + a + 'rad)';

			//the origin is specified like background-position values, eg "100% 0" for "right top"
			contextarg.style[impsyntax.transforms + ORIGIN_SYNTAX] = (ox * 100) + '%\ ' + (oy * 100) + '%';
		}
	};


	//configure and apply skew() for an element
	//to implement a skew transition of a specified type
	stylefunctions.skew = function(contextarg, anitype, counter, transitprops, reversearg)
	{
		//invert the counter reset values (0 = 1, 1 = 0)
		//which is what they need to be to effect the start and end transformation 
		//the .9 tweak fixes a visual glitch in opera (probably a sub-pixel rounding error) 
		//whereby part of the initial clone in a forward transition may be momentarily visible  
		//when it should be hidden by extreme skew, causing a very brief but annoying 
		//flash at the start of some transitions (such as "TRC","CDC","CDA")
		//nb. it has to be 0.99999 -- the 0.9999999 we used for the alpha-tweak 
		//is not enough [but the 0.999 it used to be is too much! I guess tiny differences 
		//make a big difference when we're dealing with values theoretically close to infinity!]
		counter = counter == 1 ? 0 : counter == 0 ? 0.99999 : counter;
		
		//copy the newcontext dimensions, which we need both for 
		//IE's transform-origin calculations, and for the 
		//translate() we do in all browsers during double-flip transitions
		//[see twist() for more meandering notes 
		// about using contextsize vs. transitprops.contextsize :-O]
		var contextsize = {
			x : transitprops.contextsize.x,
			y : transitprops.contextsize.y
			},

		//define the base angle for each skew direction, according to type
		//a right-angle skew along either axis stretches the image such that 
		//one dimension is now zero length and the other is theoretically infinite
		//so those are the starting points [defined in radians] 
		//with one side or the other for a regular skew, and both sides 
		//for a flip; and with full 90deg for a double-flip or 45deg for a single
		baseangle = [
			/^(TL|BR)(C|DF)|BCFF|MDC$/.test(anitype) 							//(TLC|TLDF|BRC|BRDF|BCFF|MDC)
				? RIGHT_ANGLE 
				: /^(TR|BL)(A|DF)|TCFF|MDA$/.test(anitype)						//(TRA|TRDF|BLA|BLDF|TCFF|MDA)
					? -RIGHT_ANGLE
					: /^T(RB|LF)|B(LB|RF)|(TC|BC)AF$/.test(anitype) 			//(TRB|TLF|BLB|BRF|TCAF|BCAF)
						? RIGHT_ANGLE / 2
						: /^T(LB|RF)|B(RB|LF)|(TC|BC)CF$/.test(anitype) 		//(TLB|TRF|BRB|BLF|TCCF|BCCF)
							? -RIGHT_ANGLE / 2
							: 0, 
			/^(TL|BR)(A|DF)|BCFF|CDA$/.test(anitype) 							//(TLA|TLDF|BRA|BRDF|BCFF|CDA)
				? RIGHT_ANGLE 
				: /^(TR|BL)(C|DF)|TCFF|CDC$/.test(anitype)						//(TRC|TRDF|BLC|BLDF|TCFF|CDC)
					? -RIGHT_ANGLE
					: /^T(RB|LF)|B(LB|RF)|(TC|BC)AF$/.test(anitype) 			//(TRB|TLF|BLB|BRF|TCAF|BCAF)
						? RIGHT_ANGLE / 2
						: /^T(LB|RF)|B(RB|LF)|(TC|BC)CF$/.test(anitype)			//(TLB|TRF|BRB|BLF|TCCF|BCCF)
							? -RIGHT_ANGLE / 2
							: 0, 
			],
						
		//then calculate the degrees of change 
		//from those angles and the counter value
		degree = [
			(1 - counter) * baseangle[0],
			(1 - counter) * baseangle[1]
			];

		//apply the values to reset or animate a skew transform
		//reset applies the base angle(s) (or zero for reverse) when counter=1
		//and it transitions to zero (or base angle(s) for reverse) when counter=0
		stylefunctions.setskew(contextarg, contextsize, 
			
			//angles (according to type; see skew() for application)
			//x-axis skew is produced by clockwise rotation for left-orientation
			//or anti-clockwise rotation for right-orientation; conversely,
			//y-axis skew is by anti-clockwise for left or clockwise for right;
			//normal [forward] transitions start with a +/- angle and resolve to zero; 
			//reverse transitions start with zero and resolve to the angle;
			[
				!reversearg ? baseangle[0] - degree[0] : 0 + degree[0]
				,
				!reversearg ? baseangle[1] - degree[1] : 0 + degree[1]
			], 

			//origin[x,y] (ditto)
			//right orientations are [1,y], left are [0,y], center are [0.5,y]
			//bottom orientations are [x,1], top are [x,0], middle are [x,0.5]
			//nb. I'm not sure that these work the same as for rotate,
			//but we're getting the right results, so what-me-worry :-)
			[
				anitype.charAt(1) == 'R' ? 1 : anitype.charAt(1) == 'L' ? 0 : 0.5
				,
				anitype.charAt(0) == 'B' ? 1 : anitype.charAt(0) == 'T' ? 0 : 0.5
			],
			
			//identify whether this is a double-flip [or flying-flip]
			//in the first half of its transformation 
			//(or the last half of a reverse transormation), so we can identify 
			//it independently of the skew angle, to add the extra transforms 
			(/[DF][F]$/.test(anitype) 
				&&(
					!reversearg 
						? Math.abs(degree[0]) < RIGHT_ANGLE / 2 
						: Math.abs(degree[0]) > RIGHT_ANGLE / 2
				)),
				
			//and for the benefit of IE's matrix filter, identify specifically 
			//whether this is a flying-flip [at any point in its transformation]
			//which determines whether we use non-tangental angles for the skew
			(/FF$/.test(anitype))
			);
	};
	
	//set skew on an element using the supported transform syntax 
	//angle is the angle of rotation, between +/-90 and 0 (pre-converted to radians)
	//origin[x,y] is origin extents, and works the same way as setscale()
	//doubleflip and flyingflip are boolean flags to identify some specific types
	//that affect some of the angles or other transformation details
	stylefunctions.setskew = function(contextarg, contextsize, anglearg, originarg, doubleflip, flyingflip)
	{
		//save some shortcuts vars, just to make the equations easier to follow
		var a = anglearg[0], 
			b = anglearg[1], 
			ox = originarg[0],
			oy = originarg[1],
			x = contextsize.x, 
			y = contextsize.y;

		//the accent value tweaks-out the translation value of a flipped-double-flip
		//for the first few frames, to soften the impact of the image appearing
		//by making it skew-in slightly instead of just BANG and it's there
		//[the translation has an accent! lol :-D]
		//this also makes more visual sense of double-flip reverse transitions
		//because then they don't just grow and grow then suddenly disappear,
		//they move "out of shot" in the last few frames as they reach their biggest size
		var accent = (Math.abs(a) - (RIGHT_ANGLE * 0.85)) * 10;
		if(accent < 0) 
		{ 
			accent = 0; 
		}
				
		//for IE's filter syntax
		if(impsyntax.transforms == MS_SYNTAX_KEY) 
		{ 
			//initialise this element's filters, if necessary [see fade() for notes]
			if(!defined(contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER]))
			{ 
				filterInit(contextarg); 
			}
			
			//compute the matrix values for the specified skew angles
			//we use tangents for all non-zero angles, except in a flying-flip transition;
			//but I confess I don't know why the tan is needed - I got here through trial and error!
			var m11 = 1,
				m12 = a != 0 ? flyingflip ? a : Math.tan(a) : 0,
				m21 = b != 0 ? flyingflip ? b : Math.tan(b) : 0,
				m22 = 1;
			
			//then if this is a double-flip [but not a flying-flip] and in the first-half 
			//of its transformation (or the second-half of a reverse transformation), 
			//we want to flip the image both horizontally and vertically 
			//to aid the illusion that you're viewing the image from the back
			//which we can do by negating all four matrix values
			//[then later, translating the position to compensate]
			//[we don't do it for flying flips because you'd hardly see it
			// and because I've run out of headspace for the translation maths!]
			if(doubleflip && !flyingflip)
			{
				m11 = -1;
				m12 = -m12;
				m21 = -m21;
				m22 = -1;
			}

			//apply the matrix to the filter
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M11 = m11;
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M12 = m12;
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M21 = m21;
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M22 = m22;

			//now we must work out the origins as x,y offsets, as we did for scale for rotate
			//the maths here is comparatively simple compared to rotate
			//but that's partly just because I've got my head round it now :-)
			
			//we need absolute angles for corner-oriented and center/middle oriented 
			//turns and flips; and inverted dimensions for corner-oriented bends
			//and top/center and bottom/center oriented double turns
			//because of the difference in orientation model between this and the other browsers
			//(ie. the others have one! we're just doing manual offsets to fake the choice)
			if(ox > 0 && oy == 0)
			{
				//nb. we only actually need to check one of these angles, not both
				//but this helps me keep the circumstances clear in my mind
				if(a > 0 && b > 0)
				{
					x = -x; 
				}
				b = Math.abs(b);
			}
			if(oy > 0 && ox == 0)
			{
				//nb. ditto
				if(a > 0 && b > 0)
				{
					y = -y; 
				}
				a = Math.abs(a);
			}
			
			//calculate the dimensions of the relevant triangle(s), 
			//according to origin, then use them to work out the translation (offsets)
			var dx = 0, 
				dy = 0;

			//if this the relevant part of a doubleflip [but not flyingflip] transition,
			//we use the translation [including accent] to compensate for the image-flip
			//as well as for simple corner origin-points
			if(doubleflip && !flyingflip)
			{
				//compute the core translation values
				var translation = {
					x : x + ((y / Math.cos(a)) * Math.sin(a)),
					y : y + ((x / Math.cos(b)) * Math.sin(b))
					};
				
				//left and top orientations
				if(ox == 0 && oy == 0)
				{
					dx = translation.x + accent;
					dy = translation.y + accent;
				}
				//right and top orientations
				else if(ox > 0 && oy == 0)
				{
					dx = translation.x - accent;
					dy = y + accent;
				}
				//left and bottom orientations
				else if(ox == 0 && oy > 0)
				{
					dx = x + accent;
					dy = translation.y - accent;
				}
				//right and bottom orientations
				else if(ox > 0 && oy > 0)
				{
					dx = x - accent;
					dy = y - accent;
				}
			}
			
			//otherwise it's used to implement origin, as with setrotate
			else
			{
				//we implement origin granularity 
				//simply by making the dimensions proportionate with it
				//just as though it were a smaller box
				x *= ox;
				y *= oy;
				
				//then re-compute new core translation values 
				//for this application and the modified x,y values
				translation = {
					x : (y / Math.cos(a)) * Math.sin(a),
					y : (x / Math.cos(b)) * Math.sin(b)
					};
					
				//right and top orientations
				if(ox > 0 && oy == 0)
				{
					dx = 0;
					dy = translation.y;
				}
				//left and bottom orientations
				else if(ox == 0 && oy > 0)
				{
					dx = translation.x;
					dy = 0;
				}
				//right and bottom orientations
				else if(ox > 0 && oy > 0)
				{
					dx = -translation.x;
					dy = -translation.y;
				}
				//left and top orientations don't need offseting
			}
			
			//apply the translation
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].Dx = dx;
			contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].Dy = dy;
		}
		
		//for others that have transform support 
		else
		{ 
			//pre-compile the transformation string, initially with just the specified skew
			var multiform = 'skew(' + a + 'rad,'+ b + 'rad)';
			
			//then if this is a double-flip [or flying-flip] and in the first-half of its
			//transformation (or the second-half of a reverse transformation), 
			//we want to flip the image both horizontally and vertically 
			//to aid the illusion that you're viewing the image from the back
			//which we do by rotating it then translating the position to compensate
			if(doubleflip)
			{
				//now compute the translation [including accent] according to origin
				var translation = 
				{
					x : (
							ox == 0
							? -x - accent
							: x + accent
						),
					y : (
							((oy == 0 && ox != 0.5) || (oy == 1 && ox == 0.5))
							? -y - accent
							: y + accent
						)
				};
				
				//add the rotation and translation to the transformation string
				multiform += ' rotate(' + (RIGHT_ANGLE * 2) + 'rad)'
						   + ' translate(' + (translation.x) + 'px,' + (translation.y) + 'px)';
			}
			
			//apply the transformation string
			contextarg.style[impsyntax.transforms] = multiform;

			//the origin is specified like background-position values, eg "100% 0" for "right top"
			contextarg.style[impsyntax.transforms + ORIGIN_SYNTAX] = (ox * 100) + '%\ ' + (oy * 100) + '%';
		}
	};


	//slide transition pre function sets the number of copies we need
	//for a single or double transition, then removes that token from the type
	stylefunctions.preslide = function(args, transitprops)
	{
		//if this is a double we need two copies of the clone
		if(args.anitype.charAt(0) == 'D') 
		{ 
			transitprops.copies = 2; 
		}
		
		//or if it's a quad, we need four
		else if(args.anitype.charAt(0) == 'Q') 
		{ 
			transitprops.copies = 4; 
		}
		
		//and once we've done that we can remove the token for single/double/twin/quad
		//which we can work out from here-on by the number of copies 
		//so we leave just the direction/orientation data 
		//which is what the slide function needs to work with
		args.anitype = args.anitype.substr(1);
	};
	
	//configure and apply position for newcontext element(s), to implement slide
	//when this is called by standby() it will be called once for each copy
	//[that we can differentiate by the value of transitprops.i]
	//but when called by oninstance it will send the array of all elements at once
	//sliding the elements is simply a case of appying left/top margin offsets
	//to move the images inside their hidden-overflow span containers
	stylefunctions.slide = function(contextarg, anitype, counter, transitprops, reversearg)
	{
		//if contextarg is just a single object, copy it into an array
		//which matches the structure of the array that otherwise gets passed
		//[and is therefore dependent on on the value of transitprops.i]
		//it's null-padded so we can clearly identify non-members, because
		//that takes less code to express than a test against undefined
		//[and is something we can manipulate freely, whereas we can't 
		//make something become undefined, because "delete" doesn't work in IE]
		//if however it's an array of less than three objects, we'll still need 
		//to null-pad the array for overall consistency, because if we don't 
		//then our existing conditions would be relying on undefined casting to false
		//which I never like to do; so instead I set a specific null value
		//and then the existing tests will deal with that correctly
		if(!(contextarg instanceof Array)) 
		{ 
			for(var nodearg=contextarg, contextarg=[], i=0; i<4; i++)
			{
				if(transitprops.i == i) { contextarg.push(nodearg); }
				else 					{ contextarg.push(NULL_VALUE); }
			}
		}
		else if(contextarg.length < 3)
		{
			for(var i=contextarg.length; i<4; i++)
			{
				contextarg.push(NULL_VALUE);
			}
		}
				
		//invert the counter reset values (0 = 1, 1 = 0)
		//which is what they need to be to effect the start and end positions
		counter = counter == 1 ? 0 : counter == 0 ? 1 : counter;
		
		//for normal transitions the increment is (counter)
		//for reverse transitions it's (1 - counter)
		var increment = !reversearg ? counter : 1 - counter,

		//save shortcuts to the contextsize properties
		cx = transitprops.contextsize.x,
		cy = transitprops.contextsize.y,
		
		//and pre-compute those values multipled by increment, 
		//which will give us a speed boost since we use them a lot
		xi = cx * increment,
		yi = cy * increment,	//geordie variable :-D
		
		//create an array for storing the image position objects
		//so we can compute them in one go and apply them in another
		//which is more efficient with code-size 
		//the matrix corresponds with the image number [0-3]
		//and each object will have positional values 
		//["x" or "y", corresponding with "left" or "top"]
		slidepositions = [];
		
		//if the first context is not null
		if(contextarg[0] != NULL_VALUE)
		{
			//calculate its position, according to type
			slidepositions[0] = 
			{
				x : /[RC]$/.test(anitype)					//(LR|TLBR|BLTR|CC)
					? -xi
					: /L$/.test(anitype)					//(RL|TRBL|BRTL)
						? xi
						: 0,
						
				y : /^C|T[LR]?B/.test(anitype)				//(TB|TLBR|TRBL|CC)
					? -yi
					: /^B[LR]?T/.test(anitype)				//(BT|BLTR|BRTL)
						? yi
						: 0
			};
		}
		
		//if the second object is not null
		if(contextarg[1] != NULL_VALUE)
		{
			//calculate its position, according to type
			slidepositions[1] = 
			{
				x : /R$/.test(anitype)						//(LR|TLBR|BLTR)
					? cx - xi
					: /L$/.test(anitype)					//(RL|TRBL|BRTL)
						? -cx + xi
						: /C$/.test(anitype)				//(CC)
							? xi
							: 0,
						
				y : /^T[LR]?B/.test(anitype)				//(TB|TLBR|TRBL)
					? cy - yi
					: /^B[LR]?T/.test(anitype)				//(BT|BLTR|BRTL)
						? -cy + yi
						: /C$/.test(anitype)				//(CC)
							? -yi
							: 0
			};
		}
		
		//if the third object is not null
		if(contextarg[2] != NULL_VALUE)
		{
			//calculate its position, for CC only
			slidepositions[2] = 
			{
				x : -xi,
				y : yi
			};
		}
		
		//if the fourth object is not null
		if(contextarg[3] != NULL_VALUE)
		{
			//calculate its position, for CC only
			slidepositions[3] = 
			{
				x : xi,
				y : yi
			};
		}
		
		
		//now iterate through the slidepositions 
		forevery(contextarg, function(i, context)
		{
			//if the corresponding context object is not null
			if(context != NULL_VALUE)
			{
				//apply the new position settings, using top/left with the 
				//relative positioning that we applied when the clone was created
				//originally this used margin to apply the position, 
				//but that sometimes created a jerky effect with noticeable jumps
				//as though the image were subject to friction in certain places
				context.style.left = slidepositions[i].x + 'px';
				context.style.top = slidepositions[i].y + 'px';
			}
		});
	};



	
	
	//-- private methods [additional image, style and filter controls] --// 

	//detect and save the supported alpha or transform syntax
	//(according to styletype), if we don't already have it
	//and return true or false by whether we have any support at all
	//so the caller can use that return value to do the transition or fallback
	function detectImplementationSyntax(contextarg, styletype)
	{
		//if the global syntax property for this styletype has already been defined
		//just return true or false by whether we have support, and we're done
		if(impsyntax[styletype] != NULL_VALUE) 
		{ 
			return impsyntax[styletype] != NO_SYNTAX_KEY; 
		}
		
		//run through the possible implementations to detect and set the supported
		//syntax in this browser, preferring standard implementations,
		//and if we get one, immediately return true to say that we have
		//(hence the manual iterator, so we can return from this scope)
		for(var typesyntax=IMPLEMENTATION_SYNTAX[styletype], l=typesyntax.length, i=0; i<l; i++)
		{
			if(defined(contextarg.style[typesyntax[i]]))
			{
				impsyntax[styletype] = typesyntax[i]; 
				return BOOLEAN_TRUE;
			}
		}
		
		//if we're still going then we're probably IE
		//so initialise this element's filters [whether or not we need to, 
		//because it's quite convoluted to check whether we need to atm, 
		//when we don't yet know whether filters are supported at all; 
		//but it doesn't harm other browsers, so no need to code-fork]
		filterInit(contextarg);
		
		//then look for the applicable filter in windows internet explorer
		if
		(
			//we weed out win/ie5.0 by testing the length of the filters collection 
			//(where filters is returned as an object with no data)
			typeof contextarg[MS_SYNTAX_KEY] == 'object'
			&& 
			contextarg[MS_SYNTAX_KEY].length > 0 
			&&
			(
				//if the styletype is "transforms" look for the Matrix filter
				//we identify the specific matrix filter by name
				//then weed out mac/ie5 by further testing the M11 property 
				//(or any of its four matrix entries) 
				//which should be a number, but is undefined in mac/ie5
				(styletype == 'transforms'
					&& typeof contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER] == 'object'
					&& typeof contextarg[MS_SYNTAX_KEY][MS_MATRIX_FILTER].M11 == 'number')
			|| 
				//or if the styletype is "alpha" look for the Alpha filter
				//we weed out mac/ie5 by testing first the existence of the alpha object 
				//(to prevent errors in win/ie5.0) then the returned value type 
				//(which should be a number, but in mac/ie5 is an empty string)
				(styletype == 'alpha'
					&& typeof contextarg[MS_SYNTAX_KEY][MS_ALPHA_FILTER] == 'object' 
					&& typeof contextarg[MS_SYNTAX_KEY][MS_ALPHA_FILTER].opacity == 'number')
			)
		) 
		{ 
			impsyntax[styletype] = MS_SYNTAX_KEY; 
			return BOOLEAN_TRUE;
		}
		
		//if we're still going then we have no support at all
		impsyntax[styletype] = NO_SYNTAX_KEY;
		return BOOLEAN_FALSE; 
	}


	//initialise the filters on an object
	//when we already know the syntax token and are applying a specific filter,
	//or when we're testing for the supprted syntax token in the first place;
	//in the former case only IE sees this, but in the latter case all browsers do,
	//but it doesn't do any harm, so there's no need to code fork
	function filterInit(contextarg)
	{
		//set style.filter on the context element, using the master string 
		//that contains both transform and alpha filters 
		//[for info see the MS_FILTER_STRING declaration near the start]
		contextarg.style.filter = MS_FILTER_STRING;
	}
	

	//detect and return whether images are enabled in the browser, or not
	//nb. this routine was inspired by the following techniques:
	//http://www.mawhorter.net/projects/facelift-projects/detecting-if-images-are-disabled-css-on-images-off-scenario
	//http://blogs.sitepoint.com/image-replacement-state-scope/
	//although neither of those scripts provided a complete solution 
	//(the first has some browser bugs, the latter is aysnchronous)
	//they each provided useful ideas that contributed to the end result :-)
	function detectImageSupport()
	{
		//create a blank test image, and define the data SRC values we'll be using for testing
		//nb. the escapes in the datahttp value are to protect it from compression
		var 
		dataimg = new Image,
		datablank = 'about:blank',
		datahttp = 'url(http:/\/0)';
		
		//for webkit browsers we can detect whether images are enabled, by setting the SRC to "about:blank"
		//the dataimg.complete property will then immediately and /inversely/ reflect whether images are enabled
		//nb. this works for chrome if we use a data: URI, however it fails for Safari
		//the first time the code is run in a browser session, though it works after that!
		//* in safari the only image option is not to load them when the page opens
		//* so if you run a transition the new image will show, even though initial image support was false!
		//* (except that isn't what happens in windows safari, only on the mac!)
		if(defined(dataimg.style.webkitOpacity))
		{
			dataimg.src = datablank;
		
			return !dataimg.complete; 
		}

		//for opera we do exactly the same thing, except that its response is the other way round
		//ie. the complete property will immediately and /positively/ reflect whether images are enabled
		//nb. we couldn't use a real or data: URI in opera as the response is affected by the status of the cache
		//(it should return false when images are enabled, but returns true if the image exists in cache)
		//* opera doesn't always return the right values if the disabled state of images
		//* is different between different tabs ... don't think I can do anything about that!
		else if(defined(window.opera))
		{
			dataimg.src = datablank;
		
			return dataimg.complete; 
		}

		//for firefox that solution doesn't work, and using a real or data: URI is also affected by cache status
		//(it returns true whether or not images are enabled if the image exists in the browser cache)
		//but what we can do instead is set a background on the test image, with a resolveable URL 
		//that won't trigger onload or onerror or a cached response (it will trigger 400 Bad Request)
		//* not 110% happy with this though, wish it didn't involve this broken server request
		//then read the backgroundImage from computed style, and if images are enabled  
		//we'll get a "url()" value in return, but if images are disabled we'll get the value "none"
		//nb. I've read that some versions of firefox return "url(invalid-url:)" when images are disabled
		//although I couldn't confirm that, I've added it to the condition anyway, jic!
		else if(defined(dataimg.style.MozOpacity))
		{
			//nb. but the "load images" option in Firefox doesn't apply to local files, even though 
			//this process still returns the state of that! so always return true for local files
			if(/^file/.test(document.location.href)) 
			{ 
				return BOOLEAN_TRUE; 
			}

			dataimg.style.backgroundImage = datahttp;
			
			return !/^(none|url\(invalid)/i.test(window.getComputedStyle(dataimg, '').backgroundImage);
		}
		
		//and finally for IE we go back to using the blank, but this time the complete property
		//still isn't reliable for this, because it often mis-returns arbitrary values
		//and does so whether the image is blank, data, or a real image-file
		//the readyState property we're using for this object test returns a similarly unreliable value
		//however, IE does return a width and height for about:blank (28x30 for some reason)
		//but only when images are enabled, when images are disabled it returns 0x0
		else if(defined(dataimg.readyState))
		{
			dataimg.src = datablank;

			return dataimg.width > 0;
		}

		//if we get here then we haven't been able to establish whether image are supported
		//(which could only be because a browser was used that none of the conditions identified)
		//so in that case we've little choice than to assume we /have/ images, and return true accordingly
		//(given the balance of probabilities it's the most likely to be true)
		return BOOLEAN_TRUE;
	}
	
	
	


	//-- private methods [additional transition control utilities] --//

	//make a newcontext element completely hidden or visible [according to reverse] 
	//using the appropriate property-application function [according to appname]
	//and set initial fade [according to plusfade and reverse]
	//as the starting point for an animation of the app property
	function standby(contextarg, args, transitprops)
	{
		//bars uses the wipe reset, otherwise they use their own appname
		//apart from fade which doesn't do anything yet
		if(args.appname != 'fade')
		{
			stylefunctions[args.appname == 'bars' ? 'wipe' : args.appname](
				contextarg, 
				args.anitype, 
				!args.reverse ? 0 : 1,
				transitprops
				);
		}
		
		//if plusfade is active, set initial opacity according to reverse
		if(args.plusfade > 0) 
		{ 
			stylefunctions.fade(
				contextarg, 
				!args.reverse ? (1 - args.plusfade) : 1
				); 
		}
	}


	//finish-off the context element after a transition
	//to reset everything just before oncomplete is fired
	//in this case we pass fadesyntax in as an argument
	//because we're setting and using the "none" value to mean 
	//"don't apply fade" rather than "fade isn't supported"
	//and this allows us to define whether we want fade
	//without also having to check whether fade is supported
	function finish(newcontext, args, alphasyntax)
	{
		//get and set the new src back on the original context image
		//unless it already has that src, which it will have if this is 
		//a reverse transition, since we do an image swap at the start;
		//most of the time though this condition isn't really necessary
		//since it generally does no harm to set the src again - it 
		//wouldn't make another http request if the image was in cache;
		//however if for any reason the browser is not caching images,
		//then setting the src again will indeed make another request,
		//which is unecessary, and which we can prevent; so here we are :-)
		//nb. this indexOf test assumes a qualifed URI from the src property 
		//which is a safe assumption here in all supported browsers
		//so there's no need for us to manually qualify it 
		//if(args.context.src.indexOf(args.newcontext) == -1) 
		if(args.context.src.indexOf(args.newcontext) < 0) 
		{ 
			args.context.src = args.newcontext; 
		}
		
		//update its alt text if specified
		if(args.alttext != NULL_VALUE) 
		{ 
			args.context.alt = args.alttext;
		}
		
		//if fadesyntax is not "none", restore full opacity to the context
		//(this condition will always pass when called by fade,
		// or will pass according to plusfade when called by another transition)
		if(alphasyntax != NO_SYNTAX_KEY) 
		{ 
			stylefunctions.fade(args.context, 1); 
		}
		
		//if newcontext is not null [which it will be if this is called 
		//by the fallback function to implement the image swap]
		if(newcontext != NULL_VALUE)
		{
			//if newcontext is not an array, create an array from it
			//[it will be either a single object or an array of objects
			// so this evens-out that difference for iteration]
			if(!(newcontext instanceof Array)) { newcontext = [newcontext]; }
			
			//then run through that array, of one or more newcontexts
			forevery(newcontext, function(i, context)
			{
				//not if this reference is null
				//which it will be if this is a multi-slide transition
				//and one of the null-padded members of the contexts array
				if(context != NULL_VALUE)
				{
					//remove the newcontext element, or its parent node 
					//if it was created with addspan=true (hence the parent is a span)
					remove(/^span/i.test(context.parentNode.nodeName) ? context.parentNode : context);
				}
			});
		}
		
		//set the runningkey with the context __ix to null
		//resetting it ready for another transition on the element
		//[I'd rather just delete it, but that doesn't work in IE]
		setRunningKey(args.context.__ix, NULL_VALUE);
	}


	//the fallback function does a basic image swap and alt-text update
	//so that browsers that don't support the style property needed 
	//to implement a particular transition, still get something 
	//that's comparable in terms of creating the same end-state
	function fallback(args)
	{
		//if the do-fallback-duration is true we want to wait for the specified 
		//duration before doing the fallback behavior; otherwise we don't;
		//but either way this functionality and the subsequent user-callback 
		//is always asynchronous, same as the transitions themsleves;
		//if we do pause, to make sure that the duration is as accurate as possible
		//we're going to use the managed-timer abstraction to implement it
		//so first of all we need a named function wrapper around the meat of it
		function meatwrapper()
		{
			//call finish() with a null newcontext and no plusfade
			//which will effect the image/alt swap
			//and will also reset this runningkey, 
			//freeing up the context ready for another transition
			finish(NULL_VALUE, args, NO_SYNTAX_KEY);
		
			//for older versions of opera we need to force a redraw
			//else the new image has very fragmented rendering
			//and we may as well do it for everyone, since it does no harm,
			//rather than defining and using a browser condition;
			//I have actually encountered similar rendering bugs in 
			//older versions of safari (elsewhere, not here) 
			//so if they should crop up here, maybe this will fix them too :-)
			remove(bodynode.appendChild(document.createTextNode(' ')));

			//if a user callback function was specified, call it now
			if(args.oncomplete != NULL_VALUE) { args.oncomplete(); }
		}
		
		
		//then if do-fallback-duration is true
		if(userconfig['long-fallback'] == BOOLEAN_TRUE)
		{
			//create a managed timer instance for the specified duration
			//with no oninstance callback, and passing the meat wrapper (lol!) 
			//reference for the oncomplete callback
			doControlledTimer(args.duration, NULL_VALUE, meatwrapper);
		}
		
		//otherwise just call the wrapper, almost immediately but after a momentary pause
		//so that this function always returns *before* the user callback is called
		//which will allow the user to save the return value, then query it 
		//reliably from within their callback to know that this situation occured:
		//if a method returns null for exclusion or false for busy, the user callback
		//is not fired; so if it is fired and the return value is not true
		//then they know that something else occured - which we document is this!
		else 
		{ 
			//the time itself is not important, it could be anything
			//as long it's not so long as to be noticeable by the user
			window.setTimeout(meatwrapper, 55);
		}
		
		//return null for exclusion, which the caller then returns to the user
		return NULL_VALUE;
	}
	
	
	//create an asbtraction for manager timers
	//this controls a complete transition timer for a specified duration
	//over the defined number of steps, with callbacks for each iteration
	//and a callback for completion, and with internal auto-adjustment
	//of the timing to compensate for native innacuracies in timer speed
	function doControlledTimer(timerlength, oninstance, oncomplete)
	{
		//set the animation resolution so we get (step-resolution) steps per second
		//this gives a transition of the same resolution irrespective of the total time
		//though of course we usually won't get exactly this number
		//because timer lengths are not accurate; but close enough
		//we have to floor it because we must have an integer value
		//which means that we can't guarantee to get enough iterations to get to 100%
		//of whatever value we're modifying, and this makes it doubly important
		//that the oncomplete callbacks reset whatever they're controlling
		//eg. setting opacity to 1 where its residual value is 0.975
		var aniresolution = Math.floor((timerlength / 100) * (userconfig['step-resolution'] / 10)),
		
		//create a steps counter and a starting timestamp
		timersteps = 0,
		startstamp = new Date().getTime(),
		
		//create a private instance function
		timerinstance = function()
		{
			//increment the steps counter
			timersteps++;
			
			//if it's reached resolution call the completion callback, 
			if(timersteps == aniresolution) 
			{ 
				oncomplete(); 
			}
			
			//otherwise we're still going
			else
			{
				//if we have an oninstance callback (which a normal transition will
				//but a with-duration fallback instance won't), call it now
				//passing the resolution and timersteps values
				if(oninstance != NULL_VALUE)
				{
					oninstance(aniresolution, timersteps);
				}
				
				//calculate the discrepancy between the time that should have elapsed 
				//if timer speeds were accurate, and the time that actually has elapsed 
				var discrepancy = (
					(new Date().getTime() - startstamp)				//real time
					- (timersteps * (timerlength / aniresolution)) 	//ideal time
					);
					
				//delete the discrepancy from the speed of the next iteration
				//this effectively auto-adjusts the timer to compensate for its own innacuracy
				//both the small amount of normal latency, and unusual spikes of larger delay
				//the only innacuracy it can't handle is the amount from the final iteration
				//because of course it can't modify a running timer, only adjust the next one;
				//limit the compensation though, so that it doesn't take the speed below 10ms
				//which is the practical limit in typical good implementations
				//indeed, if we try to go faster we may end up going slower!
				//or at the very least put undue stress on the CPU
				var speed = (timerlength / aniresolution) - discrepancy;
				if(speed < 10) 
				{ 
					speed = 10; 
				}
				
				//start the next timer instance at the specified speed
				window.setTimeout(timerinstance, speed);
			}
		};
		
		//start the first timer instance to kick it off
		window.setTimeout(timerinstance, (timerlength / aniresolution));
	}
	
	
	//check the running object for an active member with the specified key
	//[the context element's __ix property] and return accordingly
	function getRunningKey(runningkey)
	{
		//check the running object for a member with the specified __ix
		//if it doesn't exist then there's never been a transition
		//on the specified element, so return null for no running transition
		if(!defined(running[runningkey])) { return NULL_VALUE; }
		
		//otherwise return the member value, either null for no running
		//transition, or true for a running transition
		return running[runningkey];
	}
		
	//set the running object with the specified key to the specified value
	function setRunningKey(runningkey, runningval)
	{
		running[runningkey] = runningval; 
	}
	
	
	//get an element's real position with respect to the canvas
	function getRealPosition(nodearg, addspan)
	{
		//define a data object of total x,y position values
		//beginning with some arbtrary test values
		var realposition = { x : 100, y : 100 },

		//then create an invisible test element at that absolute position
		//of the same type as the context node (according to addspan)
		//and appended to the same context as the argument node
		testnode = addLayoutProperties(
			bodynode.appendChild(makenode(addspan)), {
				left : realposition.x + 'px',
				top : realposition.y + 'px',
				visibility : 'hidden'
			}),

		//get the raw page position of the test element, and subtract the values 
		//we originally specified, and that tells us how innaccurate the raw position is
		//[a bit like building an infinite improbability drive by knowing how improbable it is :-)]
		//nb. this approach is only accurate for this context at this moment in time ... 
		//there are so many things that affect it, that we must do this every time we need it
		testnodeposition = getRawPosition(testnode),
		positiondiff = {
			x : (testnodeposition.x - realposition.x),
			y : (testnodeposition.y - realposition.y)
			};
			
		//so then get the raw page position of the argument node
		//subtract the known discrepancies, and that's the node's true page position B-)
		realposition = getRawPosition(nodearg);
		realposition.x -= positiondiff.x;
		realposition.y -= positiondiff.y;
		
		//delete the test element
		remove(testnode);
		
		//and return the final position
		return realposition;
	}
	
	//get the raw page position of an element from its bounding client rectangle
	//this is still affected by browser quirks and inaccuracies,
	//almost as much as the traditional technique of recursing through offset parents
	//but it's less code to type, and it's quicker, and serves just as well
	//as the basis of a raw position on which to base an accurate response
	function getRawPosition(nodearg)
	{
		var clientrect = nodearg.getBoundingClientRect();
		return { 
			x : clientrect.left, 
			y : clientrect.top
			};
	}
	

	//create and append a blank superimposed copy of an image
	function addSuperImage(original, realposition, addspan)
	{
		//create a blank image object with empty-string alt text
		//we're not using alt text from the original or input data 
		//because the image isn't in the same styling context as the original
		//and therefore won't appear the same (when visible at all, that is)
		//in any case it serves no real value, and just looks weird 
		//and usually unreadable anyway since it generally won't have a background
		//so we'll leave the transition clones with no visible alt text 
		//and just do the alt-swap that goes with the context src-swap
		var newimage = new Image;
		newimage.alt = '';
		
		//then size the image to match the original 
		//[which also may not be necessary, but then again, it may]
		sizeSuperImage(newimage, original);
		
		//then if we are adding a span wrapper
		if(addspan)
		{
			//create the wrapper appended to body and move the image inside it
			//the span has hidden overflow - which is the the whole purpose 
			//of the wrapper, so we can rotate etc. the image inside it
			//while the overflow is effectively trimmed to its bounding box
			var newspan = bodynode.appendChild(makenode());
			newspan.style.overflow = 'hidden';
			newspan.appendChild(newimage);
			
			//move the span wrapper to position directly above the original
			//passing-on the input realposition and addspan arguments
			positionSuperImage(newspan, original, realposition, addspan);

			//and set its dimensions to match
			sizeSuperImage(newspan, original);
		}		
		
		//or if we're only making an image
		else
		{
			//append the blank image to the body
			newimage = bodynode.appendChild(newimage);
		
			//move the image to position directly above the original
			//passing-on the input realposition and addspan arguments
			positionSuperImage(newimage, original, realposition, addspan);
		}
		
		//either way, return the image reference 
		//which the caller needs to finally set the image SRC
		return newimage;
	}
	
	//position the blank image/span created by addSuperImage
	//so that it's superimposed directly above the original
	function positionSuperImage(newnode, original, realposition, addspan)
	{
		//add core layout styles to the super-image,
		//then move it to the real-position specified in input
		addLayoutProperties(newnode, {
			left : realposition.x + 'px',
			top : realposition.y + 'px'
			});
			
		//if addspan is true then add the super-layout-properties
		//to the image inside the span as well, plus the inner-layout-properties
		//to apply the relative positioning that's needed for slide
		//(and doens't do any of the others any harm, in fact it might even help..
		// browser rendering is a funny thing, so let's be consistent :-))
		if(addspan)
		{
			addLayoutProperties(newnode.firstChild, INNER_LAYOUT_PROPERTIES);
		}
	}
	
	//size the blank image/span created by addSuperImage
	function sizeSuperImage(newnode, original)
	{
		//set its width and height to match the original
		//this may not be necessary if the original is at its native size
		//and we're not adding a span wrapper; but it's good to be robust
		newnode.style.width = original.offsetWidth + 'px';
		newnode.style.height = original.offsetHeight + 'px';
	}
	
	
	//add the style properties needed by the superimposed elements we use
	//[the transition clone, and the test element used for calculating its position]
	//either fundamental layout properties like position; or speculative resets 
	//for global layout properties that might exist on those elements, like margin;
	//plus any additional properties defined in the optional extraprops object;
	//crucially, we also return the input node, so that we can pass 
	//the node creation and appending directly, and subsequently assign the result 
	function addLayoutProperties(nodearg, extraprops)
	{
		forevery(SUPER_LAYOUT_PROPERTIES, function(key, prop)
		{
			nodearg.style[key] = prop;
		});
		if(defined(extraprops, NULL_VALUE))
		{
			forevery(extraprops, function(key, prop)
			{
				nodearg.style[key] = prop;
			});
		}
		return nodearg;
	}





	//-- private methods [general utilities] --//

	//shortcut function for testing whether a variable or property exists
	//with a secondary control value test -- ie. if the secondary control value is not
	//defined then we only check whether the primary test value exists; 
	//but if the control value is defined, we also check that the test value is not equal to it
	//for example defined(foo, null) would return true if foo is not undefined and is (strictly) not null
	//or defined(foo, false) would return true only if foo is defined and is strictly true 
	//[or rather, strictly not false, but for a boolean that's the same thing!]
	//or !defined(foo, false) would return true if foo is either undefined or defined and strictly false
	//whereas defined(foo) but return true if foo exists irrespective of its value
	function defined(testvalue, controlvalue)
	{
		if(typeof testvalue == 'undefined') 
		{ 
			return BOOLEAN_FALSE; 
		}
		//can't use a recursive instance here of course
		//or we'll get infinite recursion!
		if(typeof controlvalue == 'undefined') 
		{ 
			return BOOLEAN_TRUE; 
		}
		return testvalue !== controlvalue;
	}	
	
	
	//shortcut abstraction for iterating through members of an array
	//or through the enumerable properties of an object
	//(in fact, the first condition	catches anything with a length 
	//property, which also includes node lists and even strings)
	function forevery(dataobject, oninstance)
	{
		if(defined(dataobject.length))
		{
			for(var l=dataobject.length, i=0; i<l; i++)
			{
				//if oninstance returns that's a break command
				if(defined(oninstance(i, dataobject[i]))) { break; }
			}
		}
		else
		{
			for(var i in dataobject)
			{
				if(dataobject.hasOwnProperty(i))
				{
					if(defined(oninstance(i, dataobject[i]))) { break; }
				}
			}
		}
	}	
	
	
	//convert a collection to an array
	function makearray(argcollection)
	{
		var arrayarg = [];
		forevery(argcollection, function(i, argmember)
		{
			arrayarg[i] = argmember;
		});
		return arrayarg;
	}
	
	
	//create an empty element for various utility purposes
	//either a span or img according to addspan, defaulting to span if undefined
	function makenode(addspan)
	{
		return document.createElement(!defined(addspan, BOOLEAN_TRUE) ? 'span' : 'img');
	}
	
	
	//remove a node from the DOM, by reference to itself
	function remove(nodearg)
	{
		nodearg.parentNode.removeChild(nodearg);
	}
	
	
	//trim a string of leading and trailing whitespace
	function trim(s)
	{
		return s.replace(/^\s+|\s+$/g, '');
	}





	//-- private methods [debug only] --//
	if(defined(debug))
	{
		
		//each function requires its own set of validation data
		//so we need to define that data in an object 
		//indexed and references by keysindex values (from ARGUMENT_KEYS)
		var vdata = {};
		
		
		//define the validation data required by the transition method
		vdata.transitionkeys = 
		{
			//error message templates for when arguments or config values are invalidly defined
			//because of the way we pre-process undefined arguments to null, we can't actually
			//differentiate between missing and invalid required arguments in all cases
			//so the message for that has to be suitably vague! (you mean, "robust"!)
			messages :
			{
				invalid : 'The %argument passed to Transitions.%method() is not valid.',
				missing : 'The %argument required by Transitions.%method() is missing or null.'
			},
			
			//argument descriptions dictionary is used to parse the %argument token
			//to provide a more friendly description of the erroneous argument
			//so we define a unique message for each argument
			//in the same order as the argument keys array, so we can just cross-match
			//(reverse can never be invalid, so its definition is empty
			// but still present to preserve the list order)
			descriptions :
			[
				'image-reference', 
				'src', 
				'alt-text', 
				'duration', 
				'animation-type',
				'fade-depth', 
				'',
				'callback-function'
			],
			
			//validation functions for the pre-processed argument values
			//each function returns null if the value is invalid, 
			//or the value unchanged if it's fine
			validators : 
			{
				//context image
				//if the arg was a string ID it will already have been converted
				//to an object reference, or it may be an existing object reference,
				//(or for that matter, random junk of any type)
				//so we have to check that the reference is not null
				//and that it is a valid image element reference 
				elementvalue: function(argvalue)
				{
					if 
					(
						argvalue == NULL_VALUE 
						|| 
						!defined(argvalue.nodeName) 
						|| 
						!/^img/i.test(argvalue.nodeName)
					) 
					{ 
						return NULL_VALUE; 
					}
	
					return argvalue;
				},
	
				//image path (non-empty string value)
				pathvalue: function(argvalue)
				{
					return typeof argvalue == 'string' && argvalue !== '' ? argvalue : NULL_VALUE;
				},
				
				//string value (alt text parameter, which can be empty)
				stringvalue: function(argvalue)
				{
					return typeof argvalue == 'string' ? argvalue : NULL_VALUE;
				},
				
				//duration number
				//this has already been parsed to a number (of milliseconds)
				//so the value we get here will be NaN unless it's valid
				durationvalue: function(argvalue)
				{
					return isNaN(argvalue) ? NULL_VALUE : argvalue;
				},
	
				//animation type string
				//using the "linear" or "rotational" animation types according to appname
				//[this is the only validation method that requires an appname
				// because its the only one that calls on different data]
				//since the value has already been processed, the value we get here 
				//will be null if invalid, else an uppercase string;
				//and if the selected type was "RND", the pre-processing function 
				//will have already selected a random type from the applicable types array
				typevalue: function(argvalue, appname)
				{
					//if the appname is "fade" return the dummy value right back
					if(appname == 'fade') 
					{ 
						return argvalue; 
					}
					//else proceed to proper validation
					
					//if the value is null return null 
					if(argvalue == NULL_VALUE) 
					{ 
						return NULL_VALUE; 
					}
					
					//grab the applicable types array, according to appname
					//except for "grow" which shares the "wipe" array
					var typesarray = ANIMATION_TYPES[appname == 'grow' ? 'wipe' : appname];
					
					//then do an array-contains test to see if the type is valid
					//if it is valid then return it, else return null
					//we're using a normal iterator for this, not forevery
					//because we need to be able to return from this scope
					for(var l=typesarray.length, i=0; i<l; i++)
					{
						if(typesarray[i] == argvalue)
						{
							return argvalue;
						}
					}
					return NULL_VALUE;
				},
	
				//plusfade/fadedepth parameter
				//the processed value will be zero (default) if undefined
				//otherwise it will be a float or NaN, so it's only invalid
				//if NaN or if greater than 1 or less than 0
				fadedepthvalue: function(argvalue)
				{
					//so if the value is not a number
					//or it's less than 0 or greater than 1, 
					//return null, else return the value
					return isNaN(argvalue) || argvalue < 0 || argvalue > 1 ? NULL_VALUE : argvalue;
				},
				
				//reverse parameter
				//the processed value is either recognised as trueish, or it's false (default)
				//so there's no validation here, just return it right back
				reversevalue: function(argvalue)
				{
					return argvalue;
				},
				
				//callback function reference
				//there's no process for this value, so it's either a function type
				//in which case it's okay, or it isn't so it's invalid
				functionvalue: function(argvalue)
				{
					return typeof argvalue == 'function' ? argvalue : NULL_VALUE;
				}
			},
				
			//validation information for each argument, 
			//[still in the same order as the argument keys array]
			//each member is an object with data about the argument:
			//	"required" is whther the argument is required 
			//	"validate" is a reference to the validation function
			argdb :
			[
				//arg[0] = required context: source image element ID or reference
				{
					required	: BOOLEAN_TRUE,
					validate	: 'elementvalue'
				},
		
				//arg[1] = required new context: image src 
				//image paths can have such a variety of syntax, even as basic as "foo"
				//[to call an image in the same directory with a forced-type, hence no extension]
				//so there's really no good way to validate, over and above that it's a non-empty string
				//(technically, empty strings are valid, but we're still disallowing them 
				// because there's virtually no good reason to use them, and it's far more likely
				// that an empty string src passed to a transition method is a mistake)
				//I suppose we could check for special characters that aren't allowed in URIs
				//except that disallowed characters get encoded by the browser anyway, 
				//so doing that could well turn to cause more problems than it solved!
				//but if the path turns out to be invalid, they'll soon know when they try to load it!
				{ 
					required	: BOOLEAN_TRUE,
					validate 	: 'pathvalue'
				},
				
				//arg[2] = required new alt text: string alt text 
				//this is allowed to be empty because sometimes that's the most appropriate
				//value to use for an image's ALT text; for example, when the image has a 
				//caption then whatever you put for its ALT would be tautological with that
				{
					required	: BOOLEAN_TRUE,
					validate	: 'stringvalue'
				},
				
				//arg[3] = required animation duration: integer or string-integer
				{ 
					required	: BOOLEAN_TRUE,
					validate	: 'durationvalue'
				},
		
				//arg[4] = required animation type: specific string type value
				{ 
					required	: BOOLEAN_TRUE,
					validate	: 'typevalue'
				},
		
				//arg[5] = optional plusfade: added fade intensity between 0 and 1
				//where 1 is a full fade (and used for a standard fade) 
				//and 0 is no added fade (and the default if undefined)
				{
					required	: BOOLEAN_FALSE,
					validate	: 'fadedepthvalue'
				},
				
				//arg[6] = optional reverse: true or false for whether to
				//reverse the transition, defaulting to false if undefined or not trueish
				//(we accept true, "true", "yes", 1 etc. and also "-" to mean "reverse direction"
				// so it's opposed to "+" meaning "forward direction")
				{
					required	: BOOLEAN_FALSE,
					validate	: 'reversevalue'
				},
				
				//arg[7] = optional oncomplete callback: function reference
				//defaulting to null if undefined, for easy testing
				{
					required	: BOOLEAN_FALSE,
					validate	: 'functionvalue'
				}
			]
		};
	

	//close and re-open the debug section, to reduce the total brace-depth
	//that PHP has to deal with when parsing them; without this, 
	//we seem to reach a crucial depth at which it slows right down to a crawl
	//while parsing the sections with preg_replace_callback
	} if(defined(debug)) {
	

		//define the validation data required by the cache method
		vdata.cachekeys = 
		{
			//error message templates are the same as for transition, so we can just reference them 
			//from the transitionkeys validation data that we've already defined
			messages : vdata.transitionkeys.messages,
			
			//argument descriptions dictionary
			descriptions : ['paths-array', 'callback-function'],
			
			//validation functions for the pre-processed argument values
			validators : 
			{
				//array of image paths (non-empty string values)
				//the value we get here will be null if undefined
				//but is otherwise not processed
				pathsarray: function(argvalue)
				{
					//if the data is not an array then it's invalid
					if(!(argvalue instanceof Array)) { return NULL_VALUE; }
					
					//otherwise run through it and test all its values
					//if any of them are empty or not strings, then the data is invalid
					//(we'll have to use a normal iterator, not forevery here
					// because we need to be able to return from this scope)
					for(var i=0, l=argvalue.length; i<l; i++)
					{
						if(typeof argvalue[i] != 'string' || argvalue[i] === '') 
						{ 
							return NULL_VALUE; 
						}
					}
					
					//if we get here then we're good, so return the array
					return argvalue;
				},
				
				//callback function reference, referenced from transitionkeys
				functionvalue: vdata.transitionkeys.validators.functionvalue
			},
			
			//validation information for each argument, 
			argdb :
			[
				//arg[0] = required paths array: array of string SRC values
				{
					required	: BOOLEAN_TRUE,
					validate	: 'pathsarray'
				},

				//arg[1] = optional oncomplete callback: function reference
				{
					required	: BOOLEAN_FALSE,
					validate	: 'functionvalue'
				}
			]			
		};


		//define the validation data required by the define method
		vdata.definekeys = 
		{
			//error message templates, mostly the same as the others
			//but with some additional unique messages 
			//for specific name and value errors 
			messages :
			{
				invalid : vdata.transitionkeys.messages.invalid,
				missing : vdata.transitionkeys.messages.missing,
				nonexistent : 'The %argument specified in Transitions.%method() does not exist.',
				badvalue : 'The "%argument" value passed to Transitions.%method() is not valid.'
			},
			
			//argument descriptions dictionary
			descriptions : ['option-name', 'option-value'],

			//validation functions for the pre-processed argument values
			validators : 
			{
				//string config name, which must match on the userconfig object keys
				//the value we get here will be null if undefined
				//but is otherwise not processed
				configname: function(argvalue)
				{
					//if this key exists in the userconfig object
					//then return it, else null
					return defined(userconfig[argvalue]) ? argvalue : NULL_VALUE;
				},
				
				//config value, whose type and value depends on the name
				//the value we get here will be null if undefined
				//but is otherwise not processed
				configvalue: function(argvalue, argname)
				{
					//switch by name, and return null for any invalid value
					switch(argname)
					{
						//"step-resolution" and "base-zindex", must be an integer >= 2
						case 'step-resolution' : 
						case 'base-zindex' : 
						
							if(typeof argvalue != 'number' || parseInt(argvalue, 10) != argvalue || argvalue < 2)
							{
								return NULL_VALUE;
							}
							break;
							
						//"long-fallback" must be true or false
						case 'long-fallback' : 
						
							if(typeof argvalue != 'boolean')
							{
								return NULL_VALUE;
							}
							break;
					}
					
					//if we get here then we're good, so return the value
					return argvalue;
				}
			},
			
			//validation information for each argument, 
			argdb :
			[
				//arg[0] = required option name; specific string value
				{
					required	: BOOLEAN_TRUE,
					validate	: 'configname'
				},

				//arg[1] = required option value; various types depending on option name
				{
					required	: BOOLEAN_TRUE,
					validate	: 'configvalue'
				}
			]			

		};



		//run through a processed arguments object and validate it
		//checking that all the required arguments are there, and that
		//every argument value is a valid type or range of values
		function argvalidate(args, keysindex)
		{
			//save a shortcut to the applicable vdata object
			var vdatum = vdata[keysindex];
			
			//run through the arguments object, by iterating through referenced argument keys array
			//so that we have a numeric iterator as well as the corresponding argument key
			//and so that the iteration order is always predictable (although the majority of browsers
			//iterate through an object in property-creation order, this cannot be guaranteed because 
			//the specification say the order is arbitrary; indeed, some KDE versions go backwards)
			forevery(ARGUMENT_KEYS[keysindex], function(i, argkey)
			{
				//if the corresponding argument is null
				if(args[argkey] == NULL_VALUE)
				{
					//if it's required, compile and throw the required error
					if(vdatum.argdb[i].required)
					{
						//pass the missing message and parsing data to the fail function
						//(error type, base description, appname)
						//and throw the error object it returns
						throw(fail(
							vdatum.messages.missing, 
							vdatum.descriptions[i], 
							args.appname
							));
					}
					
					//otherwise there's nothing to do - any undefined optional values
					//will already have been converted to defaults, so the only 
					//remaining null values will be optionals which are okay to be null
					//(such as oncomplete), or undefined requireds
				}

				//or if the appname is "define" we need to validate them specially
				//because the validity of the second argument (value) depends on 
				//the value of the first (name); and we also need some 
				//unique error messages to describe certain errors
				else if(args.appname == 'define')
				{
					//so if this is the name argument then pass it to the 
					//name validation function, and if we get back null then 
					//throw the nonexistent parameter error
					if(argkey == 'namearg')
					{
						//[we could rationalise this with hard-coded values in many places
						// but I don't want to reduce the flexibility of the construct
						// just in case this code changes or gets rationalised in some other way
						// neither speed nor code-efficiency are particularly important here
						// since this is for debugging, never production use]
						if(vdatum.validators[vdatum.argdb[i].validate](args[argkey]) == NULL_VALUE)
						{
							//pass the nonexistent message and parsing data to the fail function
							//(error type, base description, appname)
							//and throw the error object it returns
							throw(fail(
								vdatum.messages.nonexistent, 
								vdatum.descriptions[i], 
								args.appname
								));
						}
					}
					
					//otherwise it's the value argument, so we need to pass it and the name 
					//to the value validation function, and if we get back null 
					//then throw the badvalue error
					else
					{
						//[we have to hard-coded args.namearg as the second argument]
						if(vdatum.validators[vdatum.argdb[i].validate](args[argkey], args.namearg) == NULL_VALUE)
						{
							//pass the badvalue message and parsing data to the fail function
							//(using the option name for the base description)
							//and throw the error object it returns
							throw(fail(
								vdatum.messages.badvalue, 
								args.namearg, 
								args.appname
								));
						}
					}
				}

				//otherwise proceed to normal validation
				else
				{
					//if we get null back from the validator, then it failed
					//so in that case compile and throw the missing error
					if(vdatum.validators[vdatum.argdb[i].validate](args[argkey], args.appname) == NULL_VALUE)
					{
						//pass the invalid message and parsing data to the fail function
						//(error type, base description, appname)
						//and throw the error object it returns
						throw(fail(
							vdatum.messages.invalid, 
							vdatum.descriptions[i], 
							args.appname
							));
					}
				}
			});
			
			//return the validated arguments object
			return args;
		}
		
		
		
		//compile and return a throwable error object
		//building a proper object like this instead of just throwing a string
		//produces a more coherent and developer-friendly message in the console
		//to a greater or lesser extent given the browser!
		function fail(message, description, appname)
		{
			//create a new input error error object 
			//with some cheeky extra white-space for better layout in opera :-)
			var inputerror = new Error();
			inputerror.name = '\n \n\tTransitions/InputError\ :';
	
			//parse the argument and method name tokens in the error message
			//and save the result to the error message property
			inputerror.message = message.replace('%argument', description)
										.replace('%method', appname) + '\n \n';
	
			//if the error has a stack property (Firefox and Webkit browsers)
			//parse the stack to extract the deepest file-name and line-number
			//then re-define the lineNumber and fileName properties to match
			//so that ultimately the user gets an error report that points to their error
			//rather than to the error-reporting throw() statement, as it otherwise would
			//(or rather, to the highest level of abstraction, which is usually their calling code
			// but if they abstracted it to a higher function, then it will be to that)
			//that's the idea anyway ... in reality only Firefox makes use of this:
			//Opera doesn't reveal a stack, but its native reporting shows 
			//a detailed stacktrace anyway; Webkit browsers do reveal a stack
			//and this code works, but they don't report it, just the custom message;
			//IE just throws "Unspecified Error", as helpful and informative as ever!
			if(defined(inputerror.stack))
			{
				var errorstack = inputerror.stack.split(/\s*(@|at)\s*/);
				errorstack = trim(errorstack[errorstack.length - 1]).split(/\:([0-9]+)/);
	
				inputerror.fileName = errorstack[0];
				inputerror.lineNumber = errorstack[1];
			}
			
			//finally return the error object ready to throw
			return inputerror;
		}

		
	}


//instantiate automatically in the Transitions function scope
}).apply(Transitions);