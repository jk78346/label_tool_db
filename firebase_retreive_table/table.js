function show_table(name){
	database = 	firebase.database();
	var ref = database.ref(name);
	ref.on('value', gotData, errData)
}
function gotData(data){
	console.clear();
	var context = data.val();
	var keys = Object.keys(context);
	//console.log(keys);
	for (var i = 0; i < keys.length; i++){
		var k = keys[i];
		var paperID  = context[k].paperID;
		var submission = context[k].submission;
		console.log(paperID, submission);
	}
}
function errData(err){
	console.log('Error!');
	console.log(err);
}

$(document).ready(function(){
	$('#table').click(function(){
	    show_table('shihong');
	  });
});