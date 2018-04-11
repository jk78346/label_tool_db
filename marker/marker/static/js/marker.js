
FILE_TYPE_NOT_SUPPORTED = 'FILE_TYPE_NOT_SUPPORTED';

clearSelection = function() {
  var sel;
  if ( (sel = document.selection) && sel.empty ) {
    sel.empty();
  } 
  else {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    var activeEl = document.activeElement;
    if (activeEl) {
      var tagName = activeEl.nodeName.toLowerCase();
      if ( tagName == "textarea" || (tagName == "input" && activeEl.type == "text") ) {
        // Collapse the selection to the end
        activeEl.selectionStart = activeEl.selectionEnd;
      }
    }
  }
}

syncLocalStorage = function(){
  var fileList = [];
  if(typeof files === 'undefined'){
    files = []
  }
  if(typeof articles === 'undefined'){
    articles = []
  }

  for(var i = 0; i < files.length; i++){
    var file = {'name': files[i].name, 'type': files[i].type};
    fileList.push(file);
  }
  localStorage.setItem("files", JSON.stringify(fileList));
  localStorage.setItem("articles", JSON.stringify(articles));
  localStorage.setItem("keywords", JSON.stringify(keywords));
  // localStorage.setItem("labels", JSON.stringify(labels));
}

syncKeywords = function(){
  var fileIndex = parseInt($('.fileBtn.btn-primary').attr('value'));
  if (isNaN(fileIndex)){
    return;
  }

  var labelsName = Object.keys(labels);

  if(typeof keywords === 'undefined'){
    keywords = {};
  }

  if(typeof keywords[fileIndex] === 'undefined'){
    keywords[fileIndex] = {}
  }

  for(var i = 0; i < labelsName.length; i++){
    var labelName = labelsName[i];
    keywords[fileIndex][labelName] = $('textarea.'+labelName).val();
  }
}

update = function(){
  // fileIndex = parseInt($('.fileBtn.btn-primary').attr('value'));
  // articles[fileIndex] = $('#article').val();

  syncLocalStorage();

  $('#article').focus();
  $('#result').html($('#article').val());
}



checkCurrentLabel = function(){
  if(typeof currentLabel === 'undefined'){
    alert('請先選擇標籤');
    return false;
  }
  return true;
  
}


/* Functions for control buttons -- Begin */
markText = function(e){
  e.preventDefault();
  
  selectedText = $('#article').selection();

  if(checkCurrentLabel() === false || selectedText === '')
    return;

  // if (selectedText.includes('<' + currentLabel + '>') || selectedText.includes('</' + currentLabel + '>')) {
  //   alert('Don\'t do nested mark!');
  //   return;
  // }

  if (selectedText.includes('<') || selectedText.includes('>')) {
    alert('請勿標籤含有標籤的文字');
    return;
  }
  
  markedText = '<' + currentLabel + '>' + selectedText + '</' + currentLabel + '>';
  // var highlight = window.getSelection();  
  // var spn = '<span class="highlight">' + highlight + '</span>';
  // var text = $('#article').text();
  // range = highlight.getRangeAt(0),
  // startText = text.substring(0, range.startOffset), 
  // endText = text.substring(range.endOffset, text.length);
  // $('#article').html(startText + spn + endText);

  scrollPosition = $('#article').scrollTop();
  $('#article').selection('replace', {text: markedText});
  $('#article').scrollTop(scrollPosition);
  // $('#result').scrollTop(scrollPosition);

  clearSelection();

  update();

};

unmarkText = function(e){
  e.preventDefault();

  selectedText = $('#article').selection();
  if(checkCurrentLabel() === false || selectedText === '')
    return;
  
  if(selectedText.startsWith('<' + currentLabel + '>') && selectedText.endsWith('</' + currentLabel + '>')){
    markedText = selectedText.substring(currentLabel.length+2, selectedText.length-currentLabel.length-3);

    scrollPosition = $('#article').scrollTop();
    $('#article').selection('replace', {text: markedText});
    $('#article').scrollTop(scrollPosition);

    clearSelection();
  }

  update();
};


reset = function(){
  fileIndex = parseInt($('.fileBtn.btn-primary').attr('value'));
  loadFile(fileIndex, function(){
    $('#article').val(articles[fileIndex]);
    update();
  });

}

function writeUserData(name, paperID, submit) {
  firebase.database().ref(name + "/" + paperID).set({
    paperID: paperID,
    submission : submit
  });
}

saveFile = function(e){  
  // check there is selected file
  var fileIndex = parseInt($('.fileBtn.btn-primary').attr('value'));
  if (isNaN(fileIndex)){
    return;
  }
  var keywordsHeader = JSON.stringify(keywords[fileIndex])+'\n';
  // var blob = new Blob([$('#article').val()], {type: "text/plain;charset=utf-8"});

  fileContent = keywordsHeader+articles[fileIndex];
  var blob = new Blob([fileContent], {type: "text/plain;charset=utf-8"});

  var name = prompt("請輸入標註者名稱", "")
  if (name != null && name.trim() != "") {
    saveAs(blob, name + '_' + files[fileIndex].name.replace(/\..+$/, '') + '_marked.txt');
    writeUserData(name, files[fileIndex].name.replace(/\..+$/, ''), keywordsHeader) 
  }
  else {
    alert('儲存失敗，請輸入非空白的標註者名稱。')
  }
}

saveAll = function(e){
  var zip = new JSZip();

  for (var i = 0; i < articles.length; i++){
    filename = files[i].name.replace(/\..+$/, '') + '_marked.txt';
    content = articles[i];

    if (content !== FILE_TYPE_NOT_SUPPORTED){
      zip.file(filename, content);
    }
    
  }
  
  zip.generateAsync({type:"blob"})
  .then(function(content) {
      // see FileSaver.js
      saveAs(content, "marked.zip");
    });

}

/* Functions for control buttons -- End */

loadFiles = function(){
  $('.fileBtn').removeClass('btn-primary');
  for (var i = 0; i < files.length; i++){
    loadFile(i, syncLocalStorage);
  }
}

parseKeywordsHeader = function(fileIndex, fileContent){
  var firstLine = fileContent.split('\n')[0];

  try {
    var _keywords = JSON.parse(firstLine);
    // if no error, the first line is keywords information
    keywords[fileIndex] = _keywords
    var realFileContent = fileContent.split('\n').slice(1).join('\n');
  }
  catch(err) {
    console.log(err);
    // the file have not been labeled
    var realFileContent = fileContent;

    // initialize with empty label
    var labelsName = Object.keys(labels);

    if(typeof keywords === 'undefined'){
      keywords = {};
    }

    if(typeof keywords[fileIndex] === 'undefined'){
      keywords[fileIndex] = {}
    }

    for(var i = 0; i < labelsName.length; i++){
      var labelName = labelsName[i];
      keywords[fileIndex][labelName] = '';
    }

  }

  try {
    // syncKeywords();
    // update();
  }
  catch(err) {
    console.log(err);
  }
  
  
  return realFileContent;
}

renderKeywords = function(){
  var fileIndex = parseInt($('.fileBtn.btn-primary').attr('value'));
  var labelsName = Object.keys(labels);
  for(var i = 0; i < labelsName.length; i++){
    var labelName = labelsName[i];
    $('textarea.'+labelName).val(keywords[fileIndex][labelName]);
  }
}

loadFile = function(fileIndex, callback){
  console.log('loading file: ' + fileIndex);
  var textType = /text.*/;
  file = files[fileIndex];

  if (file.type.match(textType)) {
    var reader = new FileReader();

    reader.onload = function(e) {
      articles[fileIndex] = parseKeywordsHeader(fileIndex, reader.result);

      if (callback !== null){
        callback();
      }
    }

    reader.readAsText(file);  
  } else {
    articles[fileIndex] = FILE_TYPE_NOT_SUPPORTED;
  }
}
loadLabel = function(fileObj, callback){
  labels = {}
  var textType = /text.*/;

  if (fileObj.type.match(textType)) {
    var reader = new FileReader();

    reader.onload = function(e) {
      var tmpLabels = reader.result.split('\n');

      for (var i = 0; i < tmpLabels.length; i++){
        if (tmpLabels[i].split(',').length === 2) {
          labelName = tmpLabels[i].split(',')[0];
          labelColor = tmpLabels[i].split(',')[1];

          labels[labelName] = labelColor;
        }
      }

      // if(typeof keywords === 'undefined'){
      //   keywords = {};

      //   var labelsName = Object.keys(labels);
      //   for(var i = labelsName.length-1; i >= 0; i--){
      //     keywords[labelsName[i]] = '';
      //   }
      // }
      

      if (callback !== null){
        callback();
      }
    }

    reader.readAsText(fileObj);  
  } else {
    alert('請匯入正確的標籤檔案');
  }
}

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

generateLabeledText = function(){
  var labelsName = Object.keys(labels);

  var fileIndex = parseInt($('.fileBtn.btn-primary').attr('value'));
  if (isNaN(fileIndex)){
    return;
  }

  content = articles[fileIndex];

  for(var i = labelsName.length-1; i >= 0; i--){
    var currentLabel = labelsName[i];
    currentKeywords = keywords[fileIndex][currentLabel].split('\n');

    for(var j = 0; j < currentKeywords.length; j++){
      var currentKeyword = currentKeywords[j];
      if (currentKeyword.length > 0){
        var re = new RegExp(escapeRegExp(currentKeyword), 'g');

        markedText = '<' + currentLabel + '>' + currentKeyword + '</' + currentLabel + '>';
        content = content.replace(re, markedText);

      }
    }
  }

  console.log(content);
  
  scrollPosition = $('#result').scrollTop();
  // console.log(scrollPosition);

  $('#article').val(content);
  update();
}

renderFiles = function(fileList){
  filesHtml = ''
  // console.log(fileList.files)
  $('#fileList').html('');
  var ul = $('<ul/>', {});
  for (var i = 0; i < fileList.length; i++){
    file = fileList[i];
    // filesHtml += '<button class="btn btn-default">'+ file.name + '</button>';
    // var li = $('<li/>', {});
    $('<button/>', {
      text: file.name,
      title: file.name,
      class: 'btn btn-default fileBtn',
      value: i
    }).appendTo('#fileList');

    // li.appendTo(ul);
  }

  // ul.appendTo($('#fileList'));

  $('.fileBtn').click(function(e){
    renderFile(parseInt(this.value));
  })

  // $('#fileList').html(filesHtml);
}


renderFile = function(fileIndex){
  console.log('rendering file: ' + (fileIndex))
  
  $('.fileBtn').removeClass('btn-primary');
  $('.fileBtn:nth-child('+(fileIndex+1)+')').addClass('btn-primary');

  renderKeywords();
  content = articles[fileIndex];

  $.ajax({
    type: 'POST',
    url: 'http://wm.csie.org:9001',
    crossDomain: true,
    data: {article: content},
    dataType: 'text',
    beforeSend:function(){
      $('.wordFreq').html('斷詞中...');
    },
    success: function(responseData, textStatus, jqXHR) {
      // var value = responseData;
      $('.wordFreq').html(responseData);
      console.log(responseData)
    },
    error: function (responseData, textStatus, errorThrown) {
      console.log(errorThrown);
      // alert('POST failed.');

    }
  });

  if (content === FILE_TYPE_NOT_SUPPORTED) {
    $('#article').val("File type not supported!");
    $('#result').html('File type not supported!')
  }
  else {
    // $('#article').val(content);
    // $('#result').html($('#article').val())
    generateLabeledText();
    update();
  }
}


addLabel = function(name, color){
  labels[name] = '#' + color;

  syncLocalStorage();
  renderLabels();
}

clearKeywords = function(){
  $('.labelBlocks textarea').val('');
  syncKeywords();
  generateLabeledText();
  update();
}

// renderLabels = function(){
//   var labelsName = Object.keys(labels);
//   $('#header .dropdown .dropdown-menu').html('<li><a class="dropdown-item" href="#" id="addLabelButton">新增標籤</a></li>');
//   $('#addLabelButton').click(function(){
//     $('#addLabelModal').modal('show');
//   });

//   console.log(labelsName);
//   for(var i = labelsName.length-1; i >= 0; i--){
//     var li = $('<li/>', {});
//     $('<a/>', {
//       text: labelsName[i],
//       class: 'dropdown-item label ' + labelsName[i],
//       value: labels[labelsName[i]],
//     }).appendTo(li);

//     li.prependTo('#header .dropdown .dropdown-menu');

//     styleSheet.insertRule("#result " + labelsName[i] + ", ." + labelsName[i] + "{ font-weight: bold; color: " + labels[labelsName[i]] + " !important;}", 0);
//     console.log(styleSheet);
//   }

//   $('#header .dropdown .dropdown-menu .label').click(function(e){
//     var labelName = this.text;
//     var labelColor = this.getAttribute('value');

//     currentLabel = labelName;
//     console.log(currentLabel);
//     $('#header .dropdown-toggle').html(currentLabel).css('background-color', labels[currentLabel]);

//   });
// }
renderLabels = function(){
  var labelsName = Object.keys(labels);
  $('.labels .labelButtons').html('<center><button id="updateArticle" class="btn btn-primary">更新全文標色</button></<center>');
  
  console.log(labelsName);

  // container for singleLabelBlock
  $('<div/>', {
    class: 'labelBlocks',
  }).appendTo('.labels .labelButtons');


  for(var i = 0; i < labelsName.length; i++){

    var labelName = labelsName[i];
    $('<div/>', {
      class: 'singleLabelBlock ' + labelName,
    }).appendTo('.labels .labelBlocks');

    $('<button/>', {
      text: labelName,
      class: 'btn btn-secondary label labelButton ' + labelName,
      value: labels[labelName],
    }).appendTo('.singleLabelBlock.'+labelName);
    $('<textarea/>', {
      class: '' + labelName,
    }).appendTo('.singleLabelBlock.'+labelName);


    styleSheet.insertRule("#result " + labelsName[i] + ", ." + labelsName[i] + "{ font-weight: bold; color: " + labels[labelsName[i]] + " !important;}", 0);
    // console.log(styleSheet);
  }

  // a single label button is clicked
  $('.labelButtons .labelButton').click(function(e){
    var selObj = window.getSelection(); 
    var selectedText = selObj.toString();

    var labelName = this.textContent;
    var labelColor = this.getAttribute('value');

    currentLabel = labelName;

    $('textarea.'+labelName).val($('textarea.'+labelName).val()+selectedText+'\n');

    // keywords[labelName] += selectedText+'\n';

    syncKeywords();
    generateLabeledText();

    // $('.labelButtons .btn').removeClass('btn-info');
    // $('.labelButtons .btn.'+labelName).addClass('btn-info');

    $('#mark').click();


    // $('#header .dropdown-toggle').html(currentLabel).css('background-color', labels[currentLabel]);

  });


  $('<button/>', {
    text: '清除所有關鍵字',
    id: 'clearKeywords',
    class: 'btn btn-primary'
  }).appendTo('.labels .labelBlocks');



  $('button#updateArticle').click(function(){
    syncKeywords();
    generateLabeledText();
  });
  $('button#clearKeywords').click(function(){
    if (confirm("確定要清空所有關鍵字？")) {
      clearKeywords();
    }
    else {
    }
  });

  $('#fileListContainer').show();
}

$(document).ready(function(){

  // $('#article').linenumbers({col_width:'75px'});

  $('[data-toggle="tooltip"]').tooltip();
  $('#article').val('');
  $('#result').val('');

  $('#fileListContainer').hide();

  // bind click event on file selector label
  $('#fileInputLabel').click(function(){
    $('#fileInput').click();
  });
  $('#labelInputLabel').click(function(){
    $('#labelInput').click();
  });

  $('#mark').on('click', markText);
  $('#unmark').on('click', unmarkText);
  $('#save').on('click', saveFile);
  $('#saveAll').on('click', saveAll);
  $('#reset').on('click', reset);
  localStorage = window.localStorage;
  styleSheets = document.styleSheets;
  styleSheet = document.styleSheets[3];


  // load data from local storage
  if (localStorage.getItem('files') && localStorage.getItem('articles') && localStorage.getItem('keywords')){
    files = JSON.parse(localStorage.getItem('files'));
    articles = JSON.parse(localStorage.getItem('articles'));
    keywords = JSON.parse(localStorage.getItem('keywords'));

    renderFiles(files);
  }

  // add label
  $('#addLabelButton').click(function(){
    $('#addLabelModal').modal('show');
  });
  $('#saveLabelButton').click(function(){
    var labelName = $('input[name=addLabelName]').val();
    var labelColor = $('input[name=addLabelColor]').val();

    if(labelName !== '' && labelColor !== ''){
      addLabel(labelName, labelColor);
      $('input[name=addLabelName]').val('');
      $('input[name=addLabelColor]').val('');
      $('#addLabelModal').modal('hide');
    }
  });

  // label name can only contain alphabets
  $('input[name=addLabelName]').on('keyup', function(e){
    var str = $( this ).val();
    str = str.replace(/[^A-Za-z-0-9\s]/g, "").substring(0,15);

    if($( this ).val() != str) {
      $( this ).val( str );
    }
  });


  $('#article').keypress(function(event){
    // console.log('keyCode =' + event.which);
    if(event.which == 113){ // q
      markText(event);
    }
    else if (event.which == 119){ // w
      unmarkText(event);
    }
    else if (event.which == 101){ // e
      $('#article').blur()
    }
    else if (event.which == 114){ // e
      reset();
    }
    else if (event.which == 115){ // s
      saveFile(event);
    }
    else if (event.which == 97){
      saveAll(event);
    }
    else {
      console.log('keyCode = ' + event.which);
    }
  });



  // file selector
  $('#fileInput').change(function(ev) {
    console.log(ev);

    // clear article and keywords
    $('#article').val('')
    $('#result').html($('#article').val())
    

    files = this.files;
    articles = new Array(files.length);
    
    keywords = {}
    loadFiles(files);
    renderFiles(files);

    clearKeywords();
    // renderFile(0)





  });
  $('#labelInput').change(function(ev) {
    console.log(ev);
    loadLabel(this.files[0], renderLabels);
  });

  $('#result').html($('#article').val())




});