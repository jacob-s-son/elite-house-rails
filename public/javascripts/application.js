
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

function swap_furniture_image(url) {
	$('#furniture_first_image').attr("src", url);
}

function remove_fields(link) {  
	if ( confirm("Are you sure ?") ) {
		anchor = $("#" + link);
	  anchor.prev("input[type=hidden]").val("1");
		$("#image_container_" + link ).hide();
	}
}