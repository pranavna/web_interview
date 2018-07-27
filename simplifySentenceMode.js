/**
 * 
 */

CodeMirror.defineMode("simplifySentenceMode", function applyStyle () {
    // get all the complex words
    var complexSentences = MainScript.getComplexSentences();    
    return {
        token: function(stream,state) {
            var i;
            
            for(i = 0; i < complexSentences.length; i++) {
            		console.log(complexSentences[i]);
            		if( stream.match(complexSentences[i]) ){
            			stream.eatWhile(/[^\.]/);
            			return "complexSentenceStyle";
            		}
            }
            
            stream.eatWhile(/[^\.]/);
            
            if( !stream.eol() ){
            		stream.next();
            		stream.eatSpace();
            }
            
            return null;
        }
    };
});