

function MainScript () {};

var STATUS_OK = 200;
var simplifications = new Map();
var complexSentences = new Map();
var editorMode = "simplifyAllMode";
const EDITOR_HEIGHT = "400px"; 
const EDITOR_OFFSET = 15; 
const SYNONYM_SOURCE_SEPARATOR = "-D-";

var originalAvgFreq = 0;

/**
 * Returns list of all complex words
 *
 * @return list of complex words
 */
MainScript.getComplexWords = function() {
	return Array.from(simplifications.keys());
}

MainScript.getComplexSentences = function() {
	return Array.from(complexSentences.keys());
}

/*
 * Matches capitalization of simplifications to complex word
 * (Matches capitalization of first letter only.)
 * 
 * @param word complex word whose capitalization simplifications should match
 * @param simplificationsList list of simplifications for word
 * @return list of simplifications with matching capitalization 
 */
function matchCapitalization(word, simplificationList) {
	//if the complex word isn't empty and is capitalized
	if(word && (word.charAt(0) === word.charAt(0).toUpperCase())) { 
		//capitalize all the simplifications
		simplificationList = simplificationList.map(function capitalize(simplification) {
			return simplification.charAt(0).toUpperCase() + simplification.slice(1);
		});
	}
	return simplificationList;
}

/**
 * Called when user clicks in the text box. If the user clicks a 
 * complex word, display menu of simplifications.
 * 
 * @param e click event
 */
function onClick (e) {
	deleteExistingDropdown();
	
	console.log(e.target.className);

	//if the user clicked on a highlighted word, show simplifications menu
	 if(e.target.className === "cm-complexStyle") { 
		
		//get the token at the location clicked
		var coords = {left: e.pageX, top: e.pageY};
		var loc = editor.coordsChar(coords);
		var token = editor.getTokenAt(loc, true);

		// if the user clicked within a definable token, add a dropdown menu 
		if(loc.ch !== token.end) {
			createDropdown({line: loc.line, ch: token.start}, {line: loc.line, ch: token.end}, token.string);
    		}
	}else if(e.target.className.startsWith("cm-complexSentenceStyle")) {
		// get the sentence info (a bit hacky)
		var sentenceInfo = e.target.className.substring("cm-complexSentenceStyle".length);
		
		// remove the "cm-" tags
		sentenceInfo = sentenceInfo.replace(/ cm\-/g, " ");
		
		// remove leading space
		sentenceInfo = sentenceInfo.substring(1);
		
		//console.log("clicked: " + sentenceInfo);
		//console.log("sentence info: " + complexSentences.get(sentenceInfo));
		
		//get the token at the location clicked
		var coords = {left: e.pageX, top: e.pageY};
		var loc = editor.coordsChar(coords);
		var token = editor.getTokenAt(loc, true);

		// if the user clicked within a definable token, add a dropdown menu 
		if(loc.ch !== token.end) {
			document.getElementById("infoBox").innerHTML = complexSentences.get(sentenceInfo);
    		}
	}
}

/**
 * Deletes any existing dropdown menu
 */
function deleteExistingDropdown() {
	if ((existingMenu = document.getElementById("dropId")) !== null) {
		existingMenu.parentNode.removeChild(existingMenu);
	}
}

/**
 * Gets original text stats, highlights complex words and gets their simplifications
 *
 */
function simplify() {
	reset();
	var input = getInputText();
	console.log(input);
	
	//if there is some input, get simplifications
	if(input !== "") {		
		editor.setValue("simplifying...");
		var wordnetChecked = document.getElementById("wordnetCheck").checked;
		var UMLSChecked = document.getElementById("UMLSCheck").checked;
		var negationChecked = document.getElementById("negationCheck").checked;
		var affixChecked = document.getElementById("affixCheck").checked;
		// display original text stats
		getStatistics("original", input).then(function() {
			// send request to simplify input
			console.log("Sending simplify request...");
			sendSimplifyRequest(input, wordnetChecked, UMLSChecked, negationChecked, affixChecked);
		}).catch(function(err) {
			console.log("Error: " + err);

			// display error in stats box
			document.getElementsByClassName("original-wc")[0].innerHTML = "Error: could not get statistics";
			document.getElementsByClassName("original-wf")[0].innerHTML = "Error: could not get statistics";

			// try to simplify the text anyway
			sendSimplifyRequest(input);
		})
	}
}
/**
 * Gets simplification data from server, highlights complex words and stores simplifications
 */
function sendSimplifyRequest(input, wordnetChecked, UMLSChecked, negationChecked, affixChecked) {
	$.ajax({
		type: "POST",
		url: "/simplify",
		data: {value: input, wordnetChecked: wordnetChecked, UMLSChecked:UMLSChecked, 
			negationChecked:negationChecked, affixChecked:affixChecked},
		success: function(data) {
			var i;
			editor.setValue(input);

			//add complex words and simplifications to simplifications map
			for(i = 0; i < data.length; i++) {
				if( data[i].isLexicalChange ){
					simplifications.set(data[i].word, data[i].simplifications);
				}else{
					// this is a sentence annotation
					complexSentences.set(data[i].word, data[i].simplifications[0]);
				}
			}
			
			// highlight complex words
			//editor.setOption("mode", "simplifyMode");
			editor.setOption("mode", editorMode);
			
			// Add event listener for when user clicks on complex words
			editor.getWrapperElement().addEventListener("click", onClick);

			// Enable get stats button 
			var statsBtn = document.getElementById("statsBtn");
			statsBtn.removeAttribute("disabled");
			statsBtn.className = ("statistics");
		},
		error: function(x,t,m) {
			console.log("Error:\nx: " + x + "\nt: " + t + "\nm:" + m);
			editor.setValue("Error: Could not simplify this input.");
		}
	});
}

/**
 * Creates a menu of simplifications for a complex word
 * 
 * @param word the complex word to create simplifications menu for
 * @param start_location top left startpoint of menu (bottom left of word)
 * @param end_location bottom right end of word
 */
function createDropdown(start_location, end_location, word) {
	var dropdownDiv;
	var contentDiv;
	var menu_items = [];
	var meun_item;
	var i;

	// create the dropdown div
	dropdownDiv = document.createElement("div");
	dropdownDiv.className += "dropdown";
	dropdownDiv.id = "dropId";
	
	// create child dropdown content div
	contentDiv = document.createElement("div");
	contentDiv.className += "dropdown-content";
	dropdownDiv.appendChild(contentDiv);
	
	// get list of simplifications for word and add to the menu
	menu_items = matchCapitalization(word, simplifications.get(word.toLowerCase()).slice(0));
	for(i = 0; i < menu_items.length; i++) {
		// figure out the source
		console.log(menu_items[i]);
		var temp = menu_items[i].split(SYNONYM_SOURCE_SEPARATOR);
		
		// SHOULD PROBABLY CHECK THAT IT HAS LENGTH 2, BUT WE'LL IGNORE FOR NOW
		var word = temp[0];
		var source = temp[1];
		
		console.log(temp);
		console.log(source);
		
		if( source == "wordnet" ){
			menu_item = document.createElement("wordnet");
		}else if( source == "umls" ){
			menu_item = document.createElement("umls");
		}else if( source == "negation" ){
				menu_item = document.createElement("negation");
		}else{
			menu_item = document.createElement("generic");
		}
		
		menu_item.innerHTML = word;
		contentDiv.appendChild(menu_item);
		
		//replace original word with this simplification when clicked
		menu_item.addEventListener("click", function() {
			editor.replaceRange(this.innerHTML, start_location, end_location);
		});
	}

	// add menu widget beneath complex word
	var menu  = editor.addWidget(start_location, dropdownDiv, true);

	// find location of right side of menu
	var menu_left = editor.cursorCoords(start_location).left;
	var menu_width = document.getElementsByClassName("dropdown-content")[0].offsetWidth;
	var menu_right = menu_left + menu_width;

	// find location of right side of window
	var editor_right = window.innerWidth - EDITOR_OFFSET

	// if menu goes off the right of the editor, move it left so it ends at right of word
	if(menu_right > editor_right) {
		deleteExistingDropdown();
		var word_right = editor.cursorCoords(end_location).left;
		var menu_top = editor.cursorCoords(start_location).top;
		menu = editor.addWidget(editor.coordsChar({left: word_right - menu_width, top: menu_top}), dropdownDiv, true);
	}
}

/**
 * Resets everything related to old complex words
 *
 */
function reset() {
	//clear old complex word data
	simplifications.clear();
	
	// clear old sentence tagging
	complexSentences.clear();
	
	//reset to null highlighting mode
	editor.setOption("mode", "null");
	
	//delete dropdown menu if there is one 
	deleteExistingDropdown();
	
	//remove event listener that checks for clicks on highlighted words
	editor.getWrapperElement().removeEventListener("click", onClick);
	
	//disable get stats button
	var statsBtn = document.getElementById("statsBtn");
	statsBtn.setAttribute("disabled", true);
	statsBtn.className = ("statistics disabled");
	
	//clear all fields in the statistics box
	document.getElementsByClassName("original-wc")[0].innerHTML = "";
	document.getElementsByClassName("original-wf")[0].innerHTML = "";
	document.getElementsByClassName("revised-wc")[0].innerHTML = "";
	document.getElementsByClassName("revised-wf")[0].innerHTML = "";
	document.getElementsByClassName("pre-result")[0].innerHTML = "";
	document.getElementsByClassName("post-result")[0].innerHTML = "";
	document.getElementsByClassName("result")[0].innerHTML = "";
	
	// clear the sentence simplification box
	document.getElementById("infoBox").innerHTML = "";
}

/**
 * Clears the text box
 */
function clear() {
	editor.setValue("");
	reset();
}

function writeInfoBox() {
	document.getElementById("infoBox").innerHTML = "Test Button Clicked";
}

/**
 * Gets input text from the text box 
 */
function getInputText() {
	return editor.getValue();
}

function getStatistics(textIdentifier, input) {
	return new Promise (function(resolve, reject) {
		if (textIdentifier === "original" || textIdentifier === "revised") {
			var wc = document.getElementsByClassName(textIdentifier + "-wc")[0];
			var wf = document.getElementsByClassName(textIdentifier + "-wf")[0];
			var preRes = document.getElementsByClassName("pre-result")[0];
			var postRes = document.getElementsByClassName("post-result")[0];
			var result = document.getElementsByClassName("result")[0];

			// show that stats are being calculated
			wc.innerHTML = wf.innerHTML = "calculating..."
			if(textIdentifier === "revised") {
				preRes.innerHTML = "calculating...";
				result.innerHTML = "";
				postRes.innerHTML = "";
			}
			
			// get stats from the server
			$.post("/statistics", {
				value: input
			}, function(data){
				console.log(data);
				wc.innerHTML = data.numWords; // display word count
				wf.innerHTML = Math.round(data.averageFrequency); // display avg word freq

				// if getting statistics for revised text, get results and display
				if(textIdentifier === "revised") { 
					var originalWF = parseInt(document.getElementsByClassName("original-wf")[0].innerHTML);
					//var percent = Math.round((parseInt(wf.innerHTML)/originalWF -1)*100);
					var percent = ((parseFloat(wf.innerHTML)/originalWF -1)*100).toFixed(2);

					preRes.innerHTML = "The average word frequency of the revised text is "
					if(percent >= 0){
						result.innerHTML = percent + "% higher";
					} else {
						result.innerHTML = Math.abs(percent) + "% lower";	
					}		
					postRes.innerHTML = " than the original."		
				}

				resolve();	//done
			})
			.fail(function(err){
				reject();
				throw err;
			});
		} else {
			resolve(); // do nothing
		}
	});
	
}

/** 
 * Adds event listeners to the page 
 */
function addListeners() {
	// call clear when clear button is clicked
	document.getElementById("TestBtn").addEventListener("click", function(e){
		writeInfoBox();
	});// call clear when clear button is clicked
	document.getElementById("clearBtn").addEventListener("click", function(e){
		clear();
	});
	// call simplify when simplify button is clicked
	document.getElementById("simplifyBtn").addEventListener("click", function(e){
		simplify();
	});
	document.getElementById("statsBtn").addEventListener("click", function(e){
		getStatistics("revised", getInputText()).catch(function(err){
			console.log("Error: " + err);
			// display error messages in stats box
			document.getElementsByClassName("revised-wc")[0].innerHTML = "Error: could not get statistics.";
			document.getElementsByClassName("revised-wf")[0].innerHTML = "Error: could not get statistics.";
			document.getElementsByClassName("pre-result")[0].innerHTML = "Error: could not get statistics.";
			document.getElementsByClassName("post-result")[0].innerHTML = "";
			document.getElementsByClassName("result")[0].innerHTML = "";
		});
	})
	
	// delete any existing dropdown on window resize
	window.addEventListener("resize", deleteExistingDropdown);
}

// create text editor
var editor = CodeMirror(document.body, {
  placeholder: "Enter text to be simplified here",
  mode:  null,
  lineWrapping: true
});
editor.setSize(null, EDITOR_HEIGHT);


// insert editor before stats box so they are arranged correctly on page
var boxes = document.getElementsByClassName("boxes")[0];
var editorElt = document.getElementsByClassName("CodeMirror")[0];
var statsBox = document.getElementsByClassName("box")[0];
boxes.insertBefore(editorElt, statsBox);

addListeners();

// throw any errors that promises would otherwise silently get rid of
/*Promise.onPossiblyUnhandledRejection(function(err){
	console.log("Unhandled Error: " + err);
	throw err;	
});*/
