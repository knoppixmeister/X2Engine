/*****************************************************************************************
 * X2CRM Open Source Edition is a customer relationship management program developed by
 * X2Engine, Inc. Copyright (C) 2011-2013 X2Engine Inc.
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License version 3 as published by the
 * Free Software Foundation with the addition of the following permission added
 * to Section 15 as permitted in Section 7(a): FOR ANY PART OF THE COVERED WORK
 * IN WHICH THE COPYRIGHT IS OWNED BY X2ENGINE, X2ENGINE DISCLAIMS THE WARRANTY
 * OF NON INFRINGEMENT OF THIRD PARTY RIGHTS.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU Affero General Public License along with
 * this program; if not, see http://www.gnu.org/licenses or write to the Free
 * Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
 * 02110-1301 USA.
 * 
 * You can contact X2Engine, Inc. P.O. Box 66752, Scotts Valley,
 * California 95067, USA. or at email address contact@x2engine.com.
 * 
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU Affero General Public License version 3.
 * 
 * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "Powered by
 * X2Engine" logo. If the display of the logo is not reasonably feasible for
 * technical reasons, the Appropriate Legal Notices must display the words
 * "Powered by X2Engine".
 *****************************************************************************************/


// Globals
x2.whatsNew.timeout = null; // used to clear timeout when editor resize animation is called
x2.whatsNew.editorManualResize = false; // used to prevent editor resize animation on manual resize
x2.whatsNew.editorIsExpanded = false; // used to prevent text field expansion if already expanded


/*
Send post text to server via Ajax and minimize editor.
*/
function publishPost () {

    var editorText = window.newPostEditor.getData();

    if (!editorText.match (/<br \/>\\n&nbsp;$/)) { // append newline if there isn't one
        editorText += "<br />\n&nbsp;";
    } 

    // insert an invisible div over editor to prevent focus
    var editorOverlay = $("<div>", {"id": "editor-overlay"}).css ({
        "width": $("#post-form").css ("width"),
        "height": $("#post-form").css ("height"),
        "position": "absolute"
    });
    $("#post-form").after ($(editorOverlay));
    $(editorOverlay).position ({
        my: "left top",
        at: "left+10 top",
        of: $("#post-form")
    });

    initMinimizeEditor ();

    $.ajax({
        url:"publishPost",
        type:"POST",
        data:{
            //"text":window.newPostEditor.getData(),
            "text":editorText,
            "associationId":$("#Events_associationId").val(),
            "visibility":$("#Events_visibility").val(),
            "subtype":$("#Events_subtype").val()
        },
        success:function(){
            finishMinimizeEditor ();
        },
        failure:function(){
            window.newPostEditor.focusManager.unlock ();
        },
        complete:function(){
            $(editorOverlay).remove ();
        }
    });
    return false;
}
    
/*
Animate resize of the new post ckeditor window.
*/
function animateEditorVerticalResize (initialHeight, newHeight, 
                                      animationTime /* in milliseconds */) {
    if (x2.whatsNew.editorManualResize) { // user is currently resizing text field manually
        return;
    }

    // calculate delta per 50 ms for given animation time
    var heightDifference = Math.abs (newHeight - initialHeight);
    var delay = 50;
    var steps = Math.ceil (animationTime / delay);
    var delta = Math.ceil (heightDifference / steps);

    var lastStepSize = delta;

    // ensure that ckeditor text field is resized exactly to specified height
    if (steps * delta > heightDifference) {
        lastStepSize = heightDifference - (steps - 1) * delta;
    } 


    var increaseHeight = newHeight - initialHeight > 0 ? true : false;
    if (!increaseHeight) delta *= -1;
    var currentHeight = initialHeight;

    if (x2.whatsNew.timeout != null) {
        window.clearTimeout (x2.whatsNew.timeout); // clear an existing animation timeout
    }
    x2.whatsNew.timeout = window.setTimeout (function resizeTimeout () {
        if (--steps === 0) {
            delta = lastStepSize;
            if (!increaseHeight) delta *= -1;
        }
        window.newPostEditor.resize ("100%", currentHeight + delta, true);
        currentHeight += delta;
        if (increaseHeight && currentHeight < newHeight) {
            x2.whatsNew.timeout = setTimeout (resizeTimeout, delay);
        } else if (!increaseHeight && currentHeight > newHeight) {
            x2.whatsNew.timeout = setTimeout (resizeTimeout, delay);
        } 
    }, delay);
}
    
/*
Called after initMinimizeEditor (), minimizes the editor.
*/
function finishMinimizeEditor () {

    if ($("[title='Collapse Toolbar']").length !== 0) {
        window.newPostEditor.execCommand ("toolbarCollapse");
    }
    var editorCurrentHeight = parseInt (
        window.newPostEditor.ui.space (
        "contents").getStyle("height").replace (/px/, ""), 10);
    var editorMinHeight = window.newPostEditor.config.height;
    animateEditorVerticalResize (editorCurrentHeight, editorMinHeight, 300);
    if (window.newPostEditor.getData () !== "") {
        window.newPostEditor.setData ("", function () { 
            window.newPostEditor.fire ("blur"); 
        });
    }
    $("#save-button").removeClass("highlight");
    $("#post-buttons").slideUp (400); 
    x2.whatsNew.editorIsExpanded = false;

    // focus on dummy input field to negate forced toolbar collapse refocusing on editor
    $("#post-form").append ($("<input>", {"id": "dummy-input"}));//, "style":"display:none;"}));
    var x = window.scrollX;
    var y = window.scrollY;
    $("#dummy-input").focus ();
    window.scrollTo (x, y); // prevent scroll from focus event
    $("#dummy-input").remove ();

    window.newPostEditor.focusManager.unlock ();

    $("#attachments").hide ();
}

/*
Called before finishMinimizeEditor (), prevents forced toolbar collapse from refocusing 
on editor.
*/
function initMinimizeEditor () {
    window.newPostEditor.focusManager.blur (true);
    window.newPostEditor.focusManager.lock ();
}


// this is a hack to temporarily improve behavior of file attachment menu
function attachmentMenuBehavior () {

    $("#submitAttach").hide (); 
    
    function submitAttachment () {
        $("#submitAttach").click (); 
        return false;
    }
    
    $("#toggle-attachment-menu-button").click (function () {
        if ($("#attachments").is (":visible")) {
            $("#save-button").bind ("click", submitAttachment);
        } else {
            $("#save-button").unbind ("click", submitAttachment);
        }
    });
}


// setup ckeditor publisher behavior
function setupEditorBehavior () {
    
    window.newPostEditor = createCKEditor (
        "Events_text", { height:70, toolbarStartupExpanded: false, placeholder: x2.whatsNew.translations['Enter text here...']}, editorCallback);
    
    function editorCallback () {
    
        // expand post buttons if user manually resizes
        CKEDITOR.instances.Events_text.on ("resize", function () {
            if (x2.whatsNew.editorManualResize && !x2.whatsNew.editorIsExpanded) { 
                CKEDITOR.instances.Events_text.focus ();
            }
        });
    
        // prevent editor resize animation when user is manually resizing
        $(".cke_resizer_ltr").mousedown (function () { 
            $(document).one ("mouseup", function () {
                x2.whatsNew.editorManualResize = false;
            });
            x2.whatsNew.editorManualResize = true;
        });
    
    }
    
    // custom event triggered by ckeditor confighelper plugin
    $(document).on ("myFocus", function () {
        if (!x2.whatsNew.editorIsExpanded) {
            x2.whatsNew.editorIsExpanded = true;
            $("#save-button").addClass ("highlight");
            var editorMinHeight = window.newPostEditor.config.height;
            var newHeight = 140;
            animateEditorVerticalResize (editorMinHeight, newHeight, 300);
            $("#post-buttons").slideDown (400); 
        }
    });
    
    // minimize editor on click outside
    $("html").click (function () {
        var editorText = window.newPostEditor.getData();
    
        if (x2.whatsNew.editorIsExpanded && editorText === "") {
    
            initMinimizeEditor ();
            finishMinimizeEditor ();
        }
    });
    
    // enables detection of a click outside the publisher div
    $("#post-form, #attachment-form").click (function (event) {
        event.stopPropagation ();
    });
    
}


function setupActivityFeed () {
    
    
    var debug = 0;
    
    function consoleLog (obj) {
        if (console != undefined) {
            if(console.log != undefined && debug) {
                console.log(obj);
            }
        }
    }
    
    function updateComments(id){
        $.ajax({
            url:"loadComments",
            data:{id:id},
            success:function(data){
                $("#"+id+"-comments").html(data);
            }
        });
    }
    
    function commentSubmit(id){
            var text=$("#"+id+"-comment").val();
            $("#"+id+"-comment").val("");
            $.ajax({
                url:"addComment",
                type:"POST",
                data:{text:text,id:id},
                success:function(data){
                    var commentCount=data;
                    $("#"+id+"-comment-count").html("<b>"+commentCount+"</b>");
                    updateComments(id);
                }
            });
    }
    
    function minimizePosts(){
        $.each($(".event-text"),function(){
            if($(this).html().length>200){
                var text=this;
                var oldText=$(this).html();
                $.ajax({
                    url:"minimizePosts",
                    type:"GET",
                    data:{"minimize":"minimize"},
                    success:function(){
                        $(text).html($(text).html().slice(0,200)).after("<span class='elipsis'>...</span>");
                        oldText="<span class='old-text' style='display:none;'>"+oldText+"</span>";
                        $(text).after(oldText);
                    }
                });
            }else{
    
            }
        });
    }

    //var minimize = x2.whatsNew.minimizeFeed;
    function restorePosts(){
        $.ajax({
            url:"minimizePosts",
            type:"GET",
            data:{"minimize":"restore"},
            success:function(){
                $(".elipsis").remove();
                $.each($(".old-text"),function(){
                    var event=$(this).prev(".event-text");
                    $(event).html($(this).html());
                });
            }
        });
    }


    var checkedFlag
    if($(":checkbox:checked").length > ($(":checkbox").length)/2){
        checkedFlag=true;
    } else {
        checkedFlag=false;
        $("#toggle-filters-link").html("Check Filters");
    }

    $(document).on("click","#toggle-filters-link",function(e){
        e.preventDefault();
        checkedFlag=!checkedFlag;
        if(checkedFlag){
            $(this).html(x2.whatsNew.translations['Uncheck Filters']);
            $(".filter-checkbox").attr("checked","checked");
        }else{
            $(this).html(x2.whatsNew.translations['Check Filters']);
            $(".filter-checkbox").attr("checked",null);
        }
    });

    $(document).on("click","#min-posts",function(e){
        e.preventDefault();
        minimizePosts();
        x2.whatsNew.minimizeFeed = true;
        $(this).toggle();
        $(this).prev().show();
    });
    
    $(document).on("click","#restore-posts",function(e){
        e.preventDefault();
        restorePosts();
        x2.whatsNew.minimizeFeed = false;
        $(this).toggle();
        $(this).next().show();
    });

    $(document).on("click","#clear-filters-link",function(e){
        e.preventDefault();
        var str=window.location+"";
        pieces=str.split("?");
        var str2=pieces[0];
        pieces2=str2.split("#");
        window.location=pieces2[0]+"?filters=true&visibility=&users=&types=&subtypes=&default=false";
    });

    $(document).ready(function(){
        if(x2.whatsNew.minimizeFeed == true){
            $("#min-posts").click();
        }
        $(".date-break.first").after("<div class='list-view'><div id='new-events' class='items' style='display:none;border-bottom:solid #BABABA;'></div></div>");
    });
    
    var username=yii.profile.username;//"'.Yii::app()->user->getName().'";
    var usergroups="'.$usersGroups.'";
    $(document).on("click","#just-me-filter",function(e){
        e.preventDefault();
        var users=new Array();
        $.each($(".users.filter-checkbox"),function(){
            if($(this).attr("name")!=username){
                users.push($(this).attr("name"));
            }
        });
    
        var str=window.location+"";
        pieces=str.split("?");
        var str2=pieces[0];
        pieces2=str2.split("#");
        window.location=pieces2[0]+"?filters=true&visibility=&users="+users+"&types=&subtypes=&default=false";
    });
    
    $(document).on("click","#my-groups-filter",function(e){
            e.preventDefault();
            var str=window.location+"";
            pieces=str.split("?");
            var str2=pieces[0];
            pieces2=str2.split("#");
            window.location=pieces2[0]+"?filters=true&visibility=&users="+usergroups+"&types=&subtypes=&default=false";
    });
    
    //var commentFlag=false;
    $(document).on("click","#toggle-all-comments",function(e){
        e.preventDefault();
        x2.whatsNew.commentFlag = !x2.whatsNew.commentFlag;
        if(x2.whatsNew.commentFlag){
            $(".comment-link").click();
        }else{
            $(".comment-hide-link").click();
        }
    });

    $('#submit-button').click (publishPost);

    if ($("#sticky-feed .empty").length !== 0) {
        $("#sticky-feed").hide ();
    }
    
    
    // show all comments
    $.each($(".comment-count"),function(){
        if($(this).attr("val")>0){
            $(this).parent().click();
        }
    });
    
    // expand all like histories
    $.each($(".like-count"),function(){
        var likeCount = parseInt ($(this).text ().replace (/[()]/g, ""), 10);
        if (likeCount > 0) {
            $(this).click();
        }
    }); 

}


function updateEventList () {
    
    $(document).on("click",".comment-link",function(e){
        var link=this;
        e.preventDefault();
        var pieces=$(this).attr("id").split("-");
        var id=pieces[0];
        $.ajax({
            url:"loadComments",
            data:{id:id},
            success:function(data){
                $("#"+id+"-comments").html(data);
                $(".empty").parent().hide();
                $("#"+id+"-comment-box").slideDown(400);
                $(link).hide();
                $(link).next().show();
            }
        });
    });
    
    $(document).on("click",".comment-hide-link",function(e){
        e.preventDefault();
        $(this).hide();
        $(this).prev().show();
        var pieces=$(this).prev().attr("id").split("-");
        var id=pieces[0];
        $("#"+id+"-comment-box").slideUp(400);
    });

    $(document).on("click",".important-link",function(e){
        var link=this;
        e.preventDefault();
        var pieces=$(this).attr("id").split("-");
        var id=pieces[0];
        $("#broadcast-dialog").dialog({
            autoOpen: true,
            buttons: {
                "Broadcast": function() {
                    $(this).dialog("close");
                    $.ajax({
                        url:"flagPost",
                        data:{
                            id:id,
                            attr:"important",
                            email:$("#emailUsers").attr("checked"),
                            color:$("#broadcastColor").val().replace("#","%23"),
                            fontColor:$("#fontColor").val().replace("#","%23"),
                            linkColor:$("#linkColor").val().replace("#","%23")
                        },
                        success:function(data){
                            if($("#broadcastColor").val()==""){
                                var color="#FFFFC2";
                            }else{
                                var color=$("#broadcastColor").val();
                            }
                            if($("#fontColor").val()!=""){
                                $(link).parents(".view.top-level").css("color",$("#fontColor").val());
                                $(link).parents(".view.top-level div.event-text-box").children(".comment-age").css("color",$("#fontColor").val());
                            }
                            if($("#linkColor").val()!=""){
                                $(link).parents(".view.top-level div.event-text-box").find("a").css("color",$("#linkColor").val());
                            }
                            $(link).parents(".view.top-level").css("background-color",color);
                            $(link).parents(".view.top-level div.event-text-box").children(".comment-age").css("background-color",color);
                            $(link).toggle();
                            $(link).next().toggle();
                            $("#broadcastColor").val("");
                            $("#fontColor").val("");
                            $("#linkColor").val("");
                            addCheckerImage ($("#broadcastColor"));
                            addCheckerImage ($("#fontColor"));
                            addCheckerImage ($("#linkColor"));
                        }
                    });
                },
                "Nevermind":function(){
                    $(this).dialog("close");
                }
            },
            height:"auto",
            width:850,
            resizable:false
        });
    
    });
    
    $(document).on("click",".unimportant-link",function(e){
        var link=this;
        e.preventDefault();
        var pieces=$(this).attr("id").split("-");
        var id=pieces[0];
        $.ajax({
            url:"flagPost",
            data:{id:id,attr:"unimportant"},
            success:function(data){
                $(link).parents(".view.top-level").css("background-color","#fff");
                $(link).parents(".view.top-level").css("color","#222");
                $(link).parents(".view.top-level div.event-text-box").find("a").css("color","#06c");
                $(link).parents(".view.top-level div.event-text-box").children(".comment-age").css("background-color","#fff");
                $(link).parents(".view.top-level div.event-text-box").children(".comment-age").css("color","#666");
    
            }
        });
        $(link).toggle();
        $(link).prev().toggle();
    });
    
    function incrementLikeCount (likeCountElem) {
        likeCount = parseInt ($(likeCountElem).html ().replace (/[() ]/g, ""), 10) + 1;
        $(likeCountElem).html (" (" + likeCount + ")");
    }
    
    function decrementLikeCount (likeCountElem) {
        likeCount = parseInt ($(likeCountElem).html ().replace (/[() ]/g, ""), 10) - 1;
        $(likeCountElem).html (" (" + likeCount + ")");
    }
    
    $(document).on("click",".like-button",function(e){
        var link=this;
        e.preventDefault();
        var pieces=$(this).attr("id").split("-");
        var id=pieces[0];
        var tmpElem = $("<span>", { "text": ($(link).text ()) });
        $(link).after (tmpElem);
        $(link).toggle();
        $.ajax({
            url:"likePost",
            data:{id:id},
            success:function(data){
                $(tmpElem).remove ();
                if (data === "liked post") {
                    incrementLikeCount ($(link).next().next());
                }
                $(link).next().toggle();
                reloadLikeHistory (id);
            }
        });
    });
    
    $(document).on("click",".unlike-button",function(e){
        var link=this;
        e.preventDefault();
        var pieces=$(this).attr("id").split("-");
        var id=pieces[0];
        var tmpElem = $("<span>", { "text": ($(link).text ()) });
        $(link).after (tmpElem);
        $(link).toggle();
        $.ajax({
            url:"likePost",
            data:{id:id},
            success:function(data){
                $(tmpElem).remove ();
                if (data === "unliked post") {
                    decrementLikeCount ($(link).next());
                }
                $(link).prev().toggle();
                reloadLikeHistory (id);
            }
        });
    });
    
    /*
    Used by unlike-button and like-button click events to update the like history
    if it is already open
    */
    function reloadLikeHistory (id) {
        var likeHistoryBox = $("#" + id + "-like-history-box");
        if (!likeHistoryBox.is(":visible")) {
            return;
        }
        var likes = $("#" + id + "-likes");
        $.ajax({
            url:"loadLikeHistory",
            data:{id:id},
            success:function(data){
                likes.html ("");
                var likeHistory = JSON.parse (data);
    
                // if last like was removed, collapse box
                if (likeHistory.length === 0) {
                    likeHistoryBox.slideUp ();
                    likes.html ("");
                    return;
                }
                for (var name in likeHistory) {
                    likes.append (likeHistory[name] + " liked this post. </br>");
                }
            }
        });
    }
    
    /*
    Display the like history in a drop down underneath the post
    */
    $(document).on("click",".like-count",function(e){
        e.preventDefault();
        var pieces=$(this).attr("id").split("-");
        var id=pieces[0];
        var likeHistoryBox = $("#" + id + "-like-history-box");
        var likes = $("#" + id + "-likes");
        if (likeHistoryBox.is(":visible")) {
            likeHistoryBox.slideUp ();
            likes.html ("");
            return;
        }
        $.ajax({
            url:"loadLikeHistory",
            data:{id:id},
            success:function(data){
                var likeHistory = JSON.parse (data);
                for (var name in likeHistory) {
                    likes.append (likeHistory[name] + " liked this post. </br>");
                    likeHistoryBox.slideDown (400);
                }
            }
        });
    });
    
    /*
    Inserts a stickied activity into the sticky feed
    */
    function insertSticky (stickyElement) {
        var id = $(stickyElement).children ().find (".comment-age").attr ("id").split ("-");
    
        // add sticky header
        if ($("#sticky-feed .empty").length !== 0) {
            $("#sticky-feed .items").append ($("<div>", {
                "class": "view top-level date-break sticky-section-header",
                "text": "- Sticky -"
            }));
            $("#sticky-feed .empty").remove ();
        }
        $("#sticky-feed").show ();
        $("#sticky-feed .items").show ();
    
        var stickyId = id[0];
        var stickyTimeStamp = id[1];
    
        // place the stickied post into the sticky feed in the correct location
        var hasInserted = false;
        $("#sticky-feed > .items > div.view.top-level.activity-feed").each (function (index, element) {
            var id = $(element).children ().find (".comment-age").attr ("id").split ("-");
            var eventId = id[0];
            var eventTimeStamp = id[1];
            if (stickyTimeStamp == eventTimeStamp) {
                if (stickyId > eventId) {
                    $(stickyElement).insertBefore ($(element));
                    hasInserted = true;
                    return false;
                }
            } else if (stickyTimeStamp > eventTimeStamp) {
                $(stickyElement).insertBefore ($(element));
                hasInserted = true;
                return false;
            }
        });
        if (!hasInserted) {
            $("#sticky-feed .items").append ($(stickyElement));
        }
    
    }
    
    /*
    Removes the activity from the activity feed and determines whether or not the
    date header needs to be removed.
    Parameter:
        activityElement - the activity element
        timeStamp - the formatted time stamp returned by ajax
    Returns:
        the detacheded activity element
    */
    function detachActivity (activityElement, timeStamp) {
        var foundMatch = false;
        var eventCount = 0;
        var match = null;
        var re = new RegExp (timeStamp, "g");
    
        // check if the activity is the only activity on a certain day,
        // if yes, remove the date header
        $("#activity-feed > .items").children ().each (function (index, element) {
            if ($(element).hasClass ("date-break")) { // found date header
                if ($(element).text ().match (re)) { // date header matches
                    foundMatch = true;
                    match = element;
                } else if (foundMatch) {
                    return false;
                }
            } else if ($(element).hasClass ("view top-level activity-feed")) { // found post
                if (foundMatch) {
                    eventCount++;
                }
            } else if ($(element).hasClass ("list-view")) { // search through new posts
                $(element).find ("div.view.top-level.activity-feed").each (function (index, element) {
                    if ($(element).hasClass ("view top-level activity-feed")) {
                        if (foundMatch) {
                            eventCount++;
                        }
                    }
                });
            }
        });
    
        if (eventCount === 1) {
            $(match).remove ();
        } else {
        }
    
        $(activityElement).children ().find (".sticky-link").mouseleave (); // close tool tip
    
        // hide extra elements if the activity is the last new post
        if ($(activityElement).parent ("#new-events").length === 1 &&
              $(activityElement).siblings ().length === 0) {
            $("#new-events").toggle ();
        }
    
        return $(activityElement).detach ();
    }
    
    function getDateHeader (timeStamp, timeStampFormatted) {
        return $("<div>", {
            "class": "view top-level date-break",
            "id": ("date-break-" + timeStamp),
            "text": ("- " + timeStampFormatted + " -")
        });
    }
    
    /*
    Inserts an activity into the activity feed. Inserts a new date header if necessary.
    Parameters:
        timeStamp - the formatted time stamp returned by ajax
    */
    function insertActivity (activityElement, timeStampFormatted) {
        var id = $(activityElement).children ().find (".comment-age").attr ("id").split ("-");
    
        if ($("#sticky-feed div.view.top-level.activity-feed").length === 0) {
            $("#sticky-feed").hide ();
        }
    
        var stickyId = id[0];
        var stickyTimeStamp = id[1];
        var re = new RegExp (timeStampFormatted, "g");
    
        var hasInserted = false;
        var foundMyHeader = false;
        var prevElement = null;
        $("#activity-feed > .items").children ().each (function (index, element) {
            if ($(element).hasClass ("date-break")) { // found date header
                if (!$(element).text ().match (re)) { // date header differs
                    var eventTimeStamp = $(element).attr ("id").split ("-")[2];
                    if (foundMyHeader) { // insert as last element under header
                        if (stickyTimeStamp > eventTimeStamp || timeStampFormatted.match (/Today/)) {
                            $(activityElement).insertBefore ($(element));
                            hasInserted = true;
                            return false;
                        }
                    } else { // create new date header
                        if (stickyTimeStamp > eventTimeStamp || timeStampFormatted.match (/Today/)) {
                            var header = getDateHeader (stickyTimeStamp, timeStampFormatted);
                            $(header).insertBefore ($(element));
                            $(activityElement).insertAfter ($(header));
                            if (timeStampFormatted.match (/Today/)) {
                                var newPostContainer = $("#activity-feed > .items > div.list-view").detach ();
                                $(newPostContainer).insertAfter ($(header));
                            }
                            hasInserted = true;
                            return false;
                        }
                    }
                } else {
                    foundMyHeader = true;
                }
            } else if ($(element).hasClass ("view top-level activity-feed")) { // found post
                var id = $(element).children ().find (".comment-age").attr ("id").split ("-");
                var eventId = id[0];
                var eventTimeStamp = id[1];
                if (stickyTimeStamp === eventTimeStamp) {
                    if (stickyId > eventId) {
                        $(activityElement).insertBefore ($(element));
                        hasInserted = true;
                        return false;
                    }
                } else if (stickyTimeStamp > eventTimeStamp) {
                    $(activityElement).insertBefore ($(element));
                    hasInserted = true;
                    return false;
                }
                prevElement = element;
            } else if ($(element).hasClass ("list-view")) { // search through new posts
                var brokeLoop = false;
                $(element).find ("div.view.top-level.activity-feed").each (function (index, element) {
                    var id = $(element).children ().find (".comment-age").attr ("id").split ("-");
                    var eventId = id[0];
                    var eventTimeStamp = id[1];
                    if (stickyTimeStamp === eventTimeStamp) {
                        if (stickyId > eventId) {
                            $(activityElement).insertBefore ($(element));
                            hasInserted = true;
                            brokeLoop = true;
                            return false;
                        }
                    } else if (stickyTimeStamp > eventTimeStamp) {
                        $(activityElement).insertBefore ($(element));
                        hasInserted = true;
                        brokeLoop = true;
                        return false;
                    }
                    prevElement = element;
                });
                if (brokeLoop) {
                    return false;
                }
            }
        });
    
        if (!hasInserted) {
            if (prevElement) { // insert post at end of activity feed
                if (foundMyHeader) {
                    $(activityElement).insertAfter ($(prevElement));
                } else {
                    var header = getDateHeader (stickyTimeStamp, timeStampFormatted);
                    $(header).insertAfter ($(prevElement));
                    $(activityElement).insertAfter ($(header));
                }
            } else { // no posts in activity feed
                var header = getDateHeader (stickyTimeStamp, timeStampFormatted);
                $("#activity-feed .list-view").before ($(header));
                $("#activity-feed > .items").append ($(activityElement));
            }
        }
    }
    
    $(document).on("click",".sticky-link",function(e){
        var link=this;
        e.preventDefault();
        var pieces=$(this).attr("id").split("-");
        var id=pieces[0];
        var tmpElem = $("<span>", { "text": ($(link).text ()) });
        $(link).after (tmpElem);
        $(link).toggle();
        $.ajax({
            url:"stickyPost",
            data:{id:id},
            success:function (data) {
                var elem = detachActivity (
                    $(link).parents ("div.view.top-level.activity-feed"), data);
                $(tmpElem).remove ();
                $(link).next().toggle();
                insertSticky (elem);
            }
        });
    });
    
    $(document).on("click",".unsticky-link",function(e){
        var link=this;
        e.preventDefault();
        var pieces=$(this).attr("id").split("-");
        var id=pieces[0];
        var tmpElem = $("<span>", { "text": ($(link).text ()) });
        $(link).after (tmpElem);
        $(link).toggle();
        $.ajax({
            url:"stickyPost",
            data:{id:id},
            success:function (data) {
                var elem = $(link).parents ("div.view.top-level.activity-feed").detach ();
                $(tmpElem).remove ();
                $(link).prev().toggle();
                insertActivity (elem, data);
            }
        });
    });
    
    var lastEventId=x2.whatsNew.lastEventId;
    var lastTimestamp=x2.whatsNew.lastTimestamp;
    function updateFeed(){
        $.ajax({
            url:"getEvents",
            type:"GET",
            data:{'lastEventId':lastEventId, 'lastTimestamp':lastTimestamp},
            success:function(data){
                data=JSON.parse(data);
                lastEventId=data[0];
                if(data[1]){
                    var text=data[1];
                    if($("#activity-feed .items .empty").html()){
                        $("#activity-feed .items").html("<div class='list-view'><div id='new-events' style='display:none;'></div></div>");
                    }
                    if($("#new-events").is(":hidden")){
                        $("#new-events").show();
                    }
                    $.each($(".list-view"), function(){
                            if(typeof $.fn.yiiListView.settings["'"+$(this).attr("id")+"'"]=="undefined")
                                $(this).yiiListView();
                        });
                    $(text).hide().prependTo("#new-events").fadeIn(1000);

                }
                if(data[2]){
                    var comments=data[2];
                    $.each(comments,function(key,value){
                        $("#"+key+"-comment-count").html("<b>"+value+"</b>");
                    });
                    if(data[3]>lastEventId)
                        lastEventId=data[3];
                    if(data[4]>lastTimestamp)
                        lastTimestamp=data[4];
                }
                var t=setTimeout(function(){updateFeed();},5000);
            }
        });
    }
    updateFeed();

    $(document).on("click",".delete-link",function(e){
        var link=this;
        pieces=$(link).attr("id").split("-");
        id=pieces[0];
        if(confirm("Are you sure you want to delete this post?")){
            window.location=x2.whatsNew.deletePostUrl + '?id=' + id;
        }else{
            e.preventDefault();
        }
    });

    $(document).on("submit","#attachment-form-form",function(){
        if(window.newPostEditor.getData()!="" && window.newPostEditor.getData()!=x2.whatsNew.translations['Enter text here...']){
            $("#attachmentText").val(window.newPostEditor.getData ());
        }
    });
    
}

function setupFeedColorPickers () {

    /*
    Convert relevent input fields to color pickers.
    */
    setupSpectrum ($('#broadcastColor'));
    setupSpectrum ($('#fontColor'));
    setupSpectrum ($('#linkColor'));
    setupSpectrum ($('#broadcastColor'));

    $('#broadcast-dialog').hide();

}


$(document).on ('ready', function whatsNewMain () {
    attachmentMenuBehavior ();
    setupEditorBehavior ();
    setupActivityFeed ();
    setupFeedColorPickers ();
    updateEventList ();
});



