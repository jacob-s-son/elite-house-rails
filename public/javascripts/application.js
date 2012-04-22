function swap_furniture_image(url, id) {
	$('#furniture_first_image').attr("src", url);
	$('#furniture_first_image').attr("title", id);
}

function remove_fields(link) {  
	if ( confirm("Are you sure ?") ) {
		anchor = $("#" + link);
	  anchor.prev("input[type=hidden]").val("1");
		$("#image_container_" + link ).hide();
	}
}

function select_locale(url, locale) {
	window.location = url.replace(/\/(lv|ru)/, "/" + locale);
}

function gallery() {
	number_of_images = arguments.length;
	images = arguments;
	i = 0;
	
	setInterval( function() {
		i = ( i < (number_of_images - 1) ) ? i+1 : 0;
		Transitions.bars("#gallery_img", images[i], "Furniture", "2", "4SCVE", "75%", "Yes");
	}, 7000)
}