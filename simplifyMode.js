/**
 * Defines a custom CodeMirror mode that highlights complex words
 *
 * @param "simplifymode" name of the mode
 * @param applyStyle function which styles text
 */
CodeMirror.defineMode("simplifyMode", function applyStyle () {
    // get all the complex words
    var complexWords = MainScript.getComplexWords();    
    return {
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
            for(i = 0; i < complexWords.length; i++) {
                if (curWord.toLowerCase() == complexWords[i].toLowerCase()) {
                    return "complexStyle";
                } 
            }
            //move on to next word until done
            stream.next();  
            return null;
        }
    };
});