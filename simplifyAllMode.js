/**
 * 
 */

// --------------------
// TODO: REPLACE SPACES IN CLASSTAG HASH KEY SO THAT THEY DON'T ACCIDENTALLY MATCH WITH CSS TAGS

const BEGIN_END_SEPARATOR = "-D-";

CodeMirror.defineMode("simplifyAllMode", function applyStyle () {
	// get all the complex words
	var complexWords = MainScript.getComplexWords();
	var simpleWordMode = {
			token: function(stream,state) {
				var i;

				//get current word (chunk containing only letters and apostrophes) 
				stream.eatWhile(/([a-zA-Z]|\')/); 
				var curWord = stream.current();

				//if current word is a word in quotes, get the word in between 
				while(curWord !== "'" && curWord.charAt(0) === "'" && curWord.charAt(curWord.length - 1) === "'") {
					curWord = curWord.substring(1, curWord.length - 1);
				}

				//if a word matches any complex word, style it with complexStyle
				for(i = 0; i < complexWords.length; i++){
					
					
					if (curWord.toLowerCase() == complexWords[i].toLowerCase()) {
						return "complexStyle";
					} 
				}
				//move on to next word until done
				stream.next();  
				return null;
			}
	};

	var complexSentences = MainScript.getComplexSentences(); 
	var sentenceMode =  {
			token: function(stream,state) {
				for(i = 0; i < complexSentences.length; i++) {
					var temp = complexSentences[i].split(BEGIN_END_SEPARATOR);
					
					if( temp.length === 2 ){
						var begin = temp[0];
						var end = temp[1];

						// check to see if we've found the beginning of a sentence we're interested in flagging
						if( stream.match(begin) ){
							// find the end of that sentence
							stream.skipTo(end);
							stream.eatSpace();
							
							// append the class information as well
							return "complexSentenceStyle " + complexSentences[i];
						}
					}else{
						console.log("Received bad complex sentence information (begin/end): " + complexSentences[i]);
					}
				}

				stream.eatWhile(/[^\.\?\!]/);

				if( !stream.eol() ){
					stream.next();
					stream.eatSpace();
				}

				return null;
			}
	};
	
	return CodeMirror.overlayMode(sentenceMode, simpleWordMode);
});