
function change_separator(separator_number) {
	if( separator_number == 1)
	{
		$("#separator").addClass("hidden");
		$("#separator_2").removeClass("hidden");
	}
	else
	{
		$("#separator").removeClass("hidden");
		$("#separator_2").addClass("hidden");
		
	}
}