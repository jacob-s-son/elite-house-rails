

//list the individual clock-number images, and define a path prefix and suffix
var 
numbers = ['0','1','2','3','4','5','6','7','8','9'],
path = 'images/time-display/',
suffix = '.png';

//compile an array of full image paths, and cache the flags 
Transitions.cache((path + numbers.join(suffix + ',' + path) + suffix).split(','));

//increase the step-resolution for smoother animation
//and so that we can run transitions with a lower minimum speed
Transitions.define('step-resolution', 32);

//enable the long-fallback option, so we get proper timing of the fallback behavior
//which we need in this instance because the time output is tweaked 
//so that it tells the right time at the /end/ of the transition, not the begining
Transitions.define('long-fallback', true);



//get the collection of image elements on the page, 
//then iterate through and use that to build an array of digit-image references
//for each image we also need a property that records the number it currently represents, 
//which we'll use in the display function as part of its conditional logic
for(var digits = [], imgs = document.getElementsByTagName('img'), l=imgs.length, i=0; i<l; i++)
{
	if(imgs[i].className.indexOf('number') >= 0)
	{
		digits.push(imgs[i]);
		digits[digits.length - 1].__number = -1;
	}
}



//define a function that retrieves the current time (hours/minutes/seconds)
//converts the time into six discreet digits, then applies those digits to the clock
function displayCurrentTime()
{
	//get a new date object that's 950ms in the future
	//so the time we show will be correct by the /end/ of the number-change transitions, 
	//rather than at the beginning as it otherwise would be
	var now = new Date(new Date().getTime() + 950);
	
	//get the basic time values and iterate through them
	for(var values = [now.getHours(), now.getMinutes(), now.getSeconds()], i=0; i<3; i++)
	{
		//if the value is less than 10 then the value-digits are "0" and the value
		//otherwise we need to calculate both of them individually
		if(values[i] < 10)
		{
			values[i] = [0, values[i]];
		}
		else
		{
			values[i] = [Math.floor(values[i] / 10), values[i] % 10];
		}
		
		//now run through the pair of values 
		for(var j=0; j<2; j++)
		{
			//create a pointer for the digits array
			var n = (i * 2) + j;
				
			//apply this value to the digit, via a half-second transition
			//but only do this if the value is different than what the digit currently shows
			//so we only do transitions on numbers when they change, not on all of them every second
			if(digits[n].__number != values[i][j])
			{
				Transitions.grow(
					digits[n], 
					path + values[i][j] + suffix,
					values[i][j].toString(),
					0.95,
					'CC',
					0.5,
					true
					);

				//update the private number property to reflect its new value
				digits[n].__number = values[i][j];
			}
		}
	}
}



//call the time function straight away to show the initial time
//passing the argument that tells it just to swap, not to transition
displayCurrentTime();

//then start a timer-interval to update the time every second
//nb. since we retrieve the system time afresh on each iteration
//the clock will not go out of time, even if the timer itself 
//is slowed-down by other factors (such as heavy CPU load)
window.setInterval(displayCurrentTime, 1000);



