
FILE_TYPE_NOT_SUPPORTED = 'FILE_TYPE_NOT_SUPPORTED';

parseKeywordsHeader = function(fileContent){
  var firstLine = fileContent.split('\n')[0];
  var _keywords;
  try {
    _keywords = JSON.parse(firstLine);
    // if no error, the first line is keywords information
    var realFileContent = fileContent.split('\n').slice(1).join('\n');
  }
  catch(err) {
    console.log(err);

    if (err.message.startsWith('JSON.parse')){
      alert('請選取正確的已標籤文章');
    }
    // the file has not been labeled
    var realFileContent = fileContent;
  }

  try {
    keywords.push(_keywords);

    var labelsName = Object.keys(labels);
    for(var i = 0; i < labelsName.length; i++){
      var labelName = labelsName[i];
      $('textarea.'+labelName).val(_keywords[labelName]);
    }
  }
  catch(err) {
    console.log(err);
  }
  
  return realFileContent;
}


loadFile = function(fileIndex, callback){
  console.log('loading file: ' + fileIndex);
  var textType = /text.*/;
  file = files[fileIndex];

  if (file.type.match(textType)) {
    var reader = new FileReader();


    var outerArguments = arguments;
    reader.onload = function(e) {
      articles[fileIndex] = parseKeywordsHeader(reader.result);

      if (callback !== null){
        console.log(outerArguments);
        
        callback(outerArguments[2]);
      }
    }

    reader.readAsText(file);  
  } else {
    articles[fileIndex] = FILE_TYPE_NOT_SUPPORTED;
  }
}

loadFiles = function(){
  if(typeof labels === 'undefined'){
    labels = {};
  }

  keywords = [];

  $('.fileBtn').removeClass('btn-primary');
  for (var i = 0; i < files.length; i++){

    if (i === files.length-1){
      loadFile(i, renderFile, i);
    }
    else{
      loadFile(i, null);
    }
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

      if(typeof keywords === 'undefined'){
        keywords = {};

        var labelsName = Object.keys(labels);
        for(var i = labelsName.length-1; i >= 0; i--){
          keywords[labelsName[i]] = '';
        }
      }
      

      if (callback !== null){
        callback();
      }
    }

    reader.readAsText(fileObj);  
  } else {
    alert('請匯入正確的標籤檔案');
  }
}

generateLabeledText = function(){
  var labelsName = Object.keys(keywords);

  var fileIndex = parseInt($('.fileBtn.btn-primary').attr('value'));
  content = articles[fileIndex];

  
  for(var i = labelsName.length-1; i >= 0; i--){
    var currentLabel = labelsName[i];
    currentKeywords = keywords[currentLabel].split('\n');

    for(var j = 0; j < currentKeywords.length; j++){
      var currentKeyword = currentKeywords[j];
      if (currentKeyword.length > 0){
        console.log(currentKeyword)
        var re = new RegExp(currentKeyword, 'g');

        markedText = '<' + currentLabel + '>' + currentKeyword + '</' + currentLabel + '>';
        console.log(markedText);
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
    $('<li/>', {
      text: file.name,
      title: file.name,
      // class: 'btn btn-default fileBtn',
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

  content = articles[fileIndex];


  console.log(keywords);
  data = []
  for (var i = 0; i < files.length; i++){
    var element = {}
    element['filename'] = files[i]['name'];
    element['keywords'] = keywords[i];
    data.push(element)
  }

  console.log(JSON.stringify(data));
  $.ajax({
    type: 'POST',
    url: 'http://wm.csie.org:9001',
    crossDomain: true,
    data: {'keywords': JSON.stringify(data)},
    dataType: 'json',
    beforeSend:function(){
      $('.analysis').html('分析中...');
    },
    success: function(responseData, textStatus, jqXHR) {
      // var value = responseData;
      $('.analysis').html('<h3>Agreement Value (交集/聯集)</h3>');
      respJson = responseData[0];
      
      $('.labelResult').html('');
      // container for singleLabelBlock
      $('<div/>', {
        class: 'labelBlocks',
      }).appendTo('.labelResult');


      for (var label in respJson) {
        if (label !== 'Micro'){

          $('<div/>', {
            class: 'singleLabelBlock ' + label,
          }).appendTo('.labelBlocks');

          $('<button/>', {
            text: label,
            class: 'btn btn-secondary label labelButton ' + label,
            value: labels[label],
          }).appendTo('.singleLabelBlock.'+label);
          $('<textarea/>', {
            class: '' + label,
          }).appendTo('.singleLabelBlock.'+label);

          result = respJson[label]['agree'];

          if (result != ''){
            result += '\n'
          }
          if (respJson[label]['disagree'] !== ''){
            result += '============\n'+respJson[label]['disagree']
          }
          $('textarea.'+label).val(result)



          $('.analysis').html($('.analysis').html()+'<br/>'+'<span>'+label+'</span>'+': '+respJson[label]['score']);
        }
      }

      $('.analysis').html($('.analysis').html()+'<br/>'+'<span>'+'Total'+'</span>'+': '+respJson['Micro']['score']);


    },
    error: function (responseData, textStatus, errorThrown) {
      console.log(errorThrown);
      alert('分析失敗，請檢查選取文件中是否包含不正確標籤');

    }
  });

  if (content === FILE_TYPE_NOT_SUPPORTED) {
    $('#article').val("File type not supported!");
    $('#result').html('File type not supported!')
  }
  else {
    // $('#article').val(content);
    $('#result').html(content);
  }
}


renderLabels = function(){
  var labelsName = Object.keys(labels);
  // $('.labels .labelButtons').html('<center><button id="updateArticle" class="btn btn-primary">更新全文標色</button> \
   // <button id="clearKeywords" class="btn btn-primary">清除所有關鍵字</button></<center>');

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
    }).val(keywords[labelName]).appendTo('.singleLabelBlock.'+labelName);


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

    // $('.labelButtons .btn').removeClass('btn-info');
    // $('.labelButtons .btn.'+labelName).addClass('btn-info');

    $('#mark').click();


    // $('#header .dropdown-toggle').html(currentLabel).css('background-color', labels[currentLabel]);

  });

  $('#fileListContainer').show();
}

$(document).ready(function(){

  // $('#article').linenumbers({col_width:'75px'});

  $('[data-toggle="tooltip"]').tooltip();
  $('#article').val('');
  $('#result').val('');

  // bind click event on file selector label
  $('#fileInputLabel').click(function(){
    $('#fileInput').click();
  });
  $('#labelInputLabel').click(function(){
    $('#labelInput').click();
  });

  localStorage = window.localStorage;
  styleSheets = document.styleSheets;
  styleSheet = document.styleSheets[2];


  // load data from local storage
  // if (localStorage.getItem('files') && localStorage.getItem('articles') && localStorage.getItem('keywords')){
    // files = JSON.parse(localStorage.getItem('files'));
    // articles = JSON.parse(localStorage.getItem('articles'));
    // keywords = JSON.parse(localStorage.getItem('keywords'));

  // renderFiles(files);
  // }


  // file selector
  $('#fileInput').change(function(ev) {
    console.log(ev);

    // clear article
    $('#result').html('');
    

    files = this.files;
    articles = new Array(files.length);

    loadFiles(files);
    renderFiles(files);
    // renderFile(0)


  });
  $('#labelInput').change(function(ev) {
    console.log(ev);
    loadLabel(this.files[0], renderLabels);
  });

  $('#result').html($('#article').val())




});