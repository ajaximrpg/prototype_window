// Copyright (c) 2006 Sébastien Gruhier (http://xilinus.com, http://itseb.com)
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, fmodify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// VERSION 1.4b

  // Constructor
  // Available parameters : className, blurClassName, title, minWidth, minHeight, maxWidth, maxHeight, width, height, top, left, bottom, right, resizable, zIndex, opacity, recenterAuto, wiredDrag
  //                        hideEffect, showEffect, showEffectOptions, hideEffectOptions, effectOptions, url, draggable, closable, minimizable, maximizable, parent, onload
  //                        add all callbacks (if you do not use an observer)
  //                        onDestroy onStartResize onStartMove onResize onMove onEndResize onEndMove onFocus onBlur onBeforeShow onShow onHide onMinimize onMaximize onClose
  
  function Window() {
    var id;
    var optionIndex = 0;
    // For backward compatibility like win= new Window("id", {...}) instead of win = new Window({id: "id", ...})
    if (arguments.length > 0) {
      if (typeof arguments[0] == "string" ) {
        id = arguments[0];
        optionIndex = 1;
      }
      else
        id = arguments[0] ? arguments[0].id : null;
    }
    
    // Generate unique ID if not specified
    if (!id)
      id = "window_" + new Date().getTime();
      
    if ($('#' + id).length)
      alert("Window " + id + " is already registered in the DOM! Make sure you use setDestroyOnClose() or destroyOnClose: true in the constructor");

    var that = this;
    this.defaultShowEffect = function(el) { $(el).show(); if ((typeof that.options.showEffectOptions.afterFinish) == 'function') that.options.showEffectOptions.afterFinish();};
    this.defaultHideEffect = function(el) { $(el).hide(); if ((typeof that.options.hideEffectOptions.afterFinish) == 'function') that.options.hideEffectOptions.afterFinish();};
    
    this.options = $.extend({
      className:         "dialog",
      blurClassName:     null,
      minWidth:          100, 
      minHeight:         20,
      resizable:         true,
      closable:          true,
      minimizable:       true,
      maximizable:       true,
      draggable:         true,
      userData:          null,
      showEffect:        (Window.hasEffectLib ? Effect.Appear : this.defaultShowEffect),
      hideEffect:        (Window.hasEffectLib ? Effect.Fade : this.defaultHideEffect),
      showEffectOptions: {},
      hideEffectOptions: {},
      effectOptions:     null,
      parent:            document.body,
      title:             "&nbsp;",
      url:               null,
      onload:            $.noop(),
      width:             200,
      height:            300,
      opacity:           1,
      recenterAuto:      true,
      wiredDrag:         false,
      closeCallback:     null,
      destroyOnClose:    false,
      gridX:             1, 
      gridY:             1      
    }, arguments[optionIndex] || {});
    if (this.options.blurClassName)
      this.options.focusClassName = this.options.className;
      
    if (typeof this.options.top == "undefined" &&  typeof this.options.bottom ==  "undefined") 
      this.options.top = this._round(Math.random()*500, this.options.gridY);
    if (typeof this.options.left == "undefined" &&  typeof this.options.right ==  "undefined") 
      this.options.left = this._round(Math.random()*500, this.options.gridX);

    if (this.options.effectOptions) {
      $.extend(this.options.hideEffectOptions, this.options.effectOptions);
      $.extend(this.options.showEffectOptions, this.options.effectOptions);
      if (this.options.showEffect == Element.Appear)
        this.options.showEffectOptions.to = this.options.opacity;
    }
    if (Window.hasEffectLib) {
      if (this.options.showEffect == Effect.Appear)
        this.options.showEffectOptions.to = this.options.opacity;
    
      if (this.options.hideEffect == Effect.Fade)
        this.options.hideEffectOptions.from = this.options.opacity;
    }
    if (this.options.hideEffect == Element.hide)
      this.options.hideEffect = function(){ $(this.element).hide(); if (this.options.destroyOnClose) this.destroy(); }.bind(this);
    
    if (this.options.parent != document.body)  
      this.options.parent = this.options.parent;
      
    this.element = this._createWindow(id);       
    this.element.win = this;
    
    // Bind event listener
    this.eventMouseDown = function(event){ event.data._initDrag(event); };
    this.eventMouseUp   = function(event){ event.data._endDrag(event); };
    this.eventMouseMove = function(event){ event.data._updateDrag(event); };
    this.eventOnLoad    = function(event){ event.data._getWindowBorderSize(event); };
    this.eventMouseDownContent = function(event){ event.data.toFront(event); };
    this.eventResize = function(event){ event.data._recenter(event); };
 
    this.topbar = $('#' + this.element.id + "_top")[0];
    this.bottombar = $('#' + this.element.id + "_bottom")[0];
    this.content = $('#' + this.element.id + "_content")[0];
    
    $(this.topbar).on("mousedown", this, this.eventMouseDown);
    $(this.bottombar).on("mousedown", this, this.eventMouseDown);
    $(this.content).on("mousedown", this, this.eventMouseDownContent);
    $(window).on("load", this, this.eventOnLoad);
    $(window).on("resize", this, this.eventResize);
    $(window).on("scroll", this, this.eventResize);
    $(this.options.parent).on("scroll", this, this.eventResize);
    
    if (this.options.draggable)  {
      var that = this;
      $.each([this.topbar, $(this.topbar).parent().prev(), $(this.topbar).parent().next()], function(i, element) {
        $(element).on("mousedown", that, that.eventMouseDown);
        $(element).addClass("top_draggable");
      });
      $.each([$(this.bottombar).parent(), $(this.bottombar).parent().prev(), $(this.bottombar).parent().next()], function(i, element) {
        $(element).on("mousedown", that, that.eventMouseDown);
        $(element).addClass("bottom_draggable");
      });
      
    }    
    
    if (this.options.resizable) {
      this.sizer = $('#' + this.element.id + "_sizer")[0];
      $(this.sizer).on("mousedown", this, this.eventMouseDown);
    }  
    
    this.useLeft = null;
    this.useTop = null;
    if (typeof this.options.left != "undefined") {
      $(this.element).css({left: parseFloat(this.options.left) + 'px'});
      this.useLeft = true;
    }
    else {
      $(this.element).css({right: parseFloat(this.options.right) + 'px'});
      this.useLeft = false;
    }
    
    if (typeof this.options.top != "undefined") {
      $(this.element).css({top: parseFloat(this.options.top) + 'px'});
      this.useTop = true;
    }
    else {
      $(this.element).css({bottom: parseFloat(this.options.bottom) + 'px'});
      this.useTop = false;
    }
      
    this.storedLocation = null;
    
    this.setOpacity(this.options.opacity);
    if (this.options.zIndex)
      this.setZIndex(this.options.zIndex);

    if (this.options.destroyOnClose)
      this.setDestroyOnClose(true);

    this._getWindowBorderSize();
    this.width = this.options.width;
    this.height = this.options.height;
    this.visible = false;
    
    this.constraint = false;
    this.constraintPad = {top: 0, left:0, bottom:0, right:0};
    
    if (this.width && this.height)
      this.setSize(this.options.width, this.options.height);
    this.setTitle(this.options.title);
    Windows.register(this);      
  }

Window.keepMultiModalWindow = false;
Window.hasEffectLib = String.prototype.parseColor != null;
Window.resizeEffectDuration = 0.4;
  
  // Destructor
  Window.prototype.destroy = function() {
    this._notify("onDestroy");
    $(this.topbar).off("mousedown", this.eventMouseDown);
    $(this.bottombar).off("mousedown", this.eventMouseDown);
    $(this.content).off("mousedown", this.eventMouseDownContent);
    
    $(window).off("load", this.eventOnLoad);
    $(window).off("resize", this.eventResize);
    $(window).off("scroll", this.eventResize);
    $(this.options.parent).off("scroll", this.eventResize);
    
    $(this.content).off("load", this.options.onload);

    if (this._oldParent) {
      var content = this.getContent();
      var originalContent = null;
      for(var i = 0; i < content.childNodes.length; i++) {
        originalContent = content.childNodes[i];
        if (originalContent.nodeType == 1) 
          break;
        originalContent = null;
      }
      if (originalContent)
        this._oldParent.appendChild(originalContent);
      this._oldParent = null;
    }

    if (this.sizer)
        $(this.sizer).off("mousedown", this.eventMouseDown);

    if (this.options.url) 
      this.content.src = null;
     
    if (this.wiredElement)
      $(this.wiredElement).remove(); 
      
    if(this.iefix) 
      $(this.iefix).remove();

    $(this.element).remove();
    Windows.unregister(this);      
  };
    
  // Sets close callback, if it sets, it should return true to be able to close the window.
  Window.prototype.setCloseCallback = function(callback) {
    this.options.closeCallback = callback;
  };
  
  // Gets window content
  Window.prototype.getContent = function () {
    return this.content;
  };
  
  // Sets the content with an element id
  Window.prototype.setContent = function(id, autoresize, autoposition) {
    var element = $('#' + id);
    if (!element.length) throw "Unable to find element '" + id + "' in DOM";
    this._oldParent = element[0].parentNode;

    var d = null;
    var p = null;

    if (autoresize) 
      d = {width: element.width(), height: element.height() };
    if (autoposition) 
      p = element.offset();

    var content = this.getContent();
    // Clear HTML (and even iframe)
    this.setHTMLContent("");
    content = this.getContent();
    
    content.appendChild(element[0]);
    element.show();
    if (autoresize) 
      this.setSize(d.width, d.height);
    if (autoposition) 
      this.setLocation(p[1] - this.heightN, p[0] - this.widthW);    
  };
  
  Window.prototype.setHTMLContent = function(html) {
    // It was an url (iframe), recreate a div content instead of iframe content
    if (this.options.url) {
      this.content.src = null;
      this.options.url = null;
      
  	  var content ="<div id=\"" + this.getId() + "_content\" class=\"" + this.options.className + "_content\"> </div>";
      $('#' + this.getId() +"_table_content")[0].innerHTML = content;
      
      this.content = $('#' + this.element.id + "_content")[0];
    }
    $(this.getContent()).html(html);
    return this;
  };
  
  Window.prototype.setAjaxContent = function(url, options, showCentered, showModal) {
    this.showFunction = showCentered ? "showCenter" : "show";
    this.showModal = showModal || false;
  
    options = options || {};

    // Clear HTML (and even iframe)
    this.setHTMLContent("");
 
    this.onComplete = options.onComplete;
    if (! this._onCompleteHandler)
      this._onCompleteHandler = this._setAjaxContent.bind(this);
    options.onComplete = this._onCompleteHandler;

    new Ajax.Request(url, options);    
    options.onComplete = this.onComplete;
  };
  
  Window.prototype._setAjaxContent = function(originalRequest) {
    Element.update(this.getContent(), originalRequest.responseText);
    if (this.onComplete)
      this.onComplete(originalRequest);
    this.onComplete = null;
    this[this.showFunction](this.showModal);
  };
  
  Window.prototype.setURL = function(url) {
    // Not an url content, change div to iframe
    if (this.options.url) 
      this.content.src = null;
    this.options.url = url;
    var content= "<iframe frameborder='0' name='" + this.getId() + "_content'  id='" + this.getId() + "_content' src='" + url + "' width='" + this.width + "' height='" + this.height + "'> </iframe>";
    $('#' + this.getId() +"_table_content")[0].innerHTML = content;
    
    this.content = $('#' + this.element.id + "_content")[0];
  };

  Window.prototype.getURL = function() {
  	return this.options.url ? this.options.url : null;
  };

  Window.prototype.refresh = function() {
    if (this.options.url)
	    $('#' + this.element.id + '_content')[0].src = this.options.url;
  };
  
  // Stores position/size in a cookie, by default named with window id
  Window.prototype.setCookie = function(name, expires, path, domain, secure) {
    name = name || this.element.id;
    this.cookie = [name, expires, path, domain, secure];
    
    // Get cookie
    var value = WindowUtilities.getCookie(name);
    // If exists
    if (value) {
      var values = value.split(',');
      var x = values[0].split(':');
      var y = values[1].split(':');

      var w = parseFloat(values[2]), h = parseFloat(values[3]);
      var mini = values[4];
      var maxi = values[5];

      this.setSize(w, h);
      if (mini == "true")
        this.doMinimize = true; // Minimize will be done at onload window event
      else if (maxi == "true")
        this.doMaximize = true; // Maximize will be done at onload window event

      this.useLeft = x[0] == "l";
      this.useTop = y[0] == "t";

      $(this.element).css(this.useLeft ? {left: x[1]} : {right: x[1]});
      $(this.element).css(this.useTop ? {top: y[1]} : {bottom: y[1]});
    }
  };
  
  // Gets window ID
  Window.prototype.getId = function() {
    return this.element.id;
  };
  
  // Detroys itself when closing 
  Window.prototype.setDestroyOnClose = function() {
    this.options.destroyOnClose = true;
  };
  
  Window.prototype.setConstraint = function(bool, padding) {
    this.constraint = bool;
    this.constraintPad = $.extend(this.constraintPad, padding || {});
    // Reset location to apply constraint
    if (this.useTop && this.useLeft)
      this.setLocation(parseFloat(this.element.style.top), parseFloat(this.element.style.left));
  };
  
  // initDrag event

  Window.prototype._initDrag = function(event) {
    // No resize on minimized window
    if (event.target == this.sizer && this.isMinimized())
      return;

    // No move on maximzed window
    if (event.target != this.sizer && this.isMaximized())
      return;
      
    if (window.ie && this.heightN == 0)
      this._getWindowBorderSize();
    
    // Get pointer X,Y
    this.pointer = [this._round(event.pageX, this.options.gridX), this._round(event.pageY, this.options.gridY)];
    if (this.options.wiredDrag) 
      this.currentDrag = this._createWiredElement();
    else
      this.currentDrag = this.element;
      
    // Resize
    if (event.target == this.sizer) {
      this.doResize = true;
      this.widthOrg = this.width;
      this.heightOrg = this.height;
      this.bottomOrg = parseFloat($(this.element).css('bottom'));
      this.rightOrg = parseFloat($(this.element).css('right'));
      this._notify("onStartResize");
    }
    else {
      this.doResize = false;

      // Check if click on close button, 
      var closeButton = $('#' + this.getId() + '_close');
      function within(el, x, y) {
        var off = $(el).offset();
        x -= off.left;
        y -= off.top;
        if ((x >= 0) && (y >= 0)) {
          if ((x <= $(el).width()) && (y <= $(el).height())) {
             return true;
          }
        }
        return false;
      };
      if (closeButton.length && within(closeButton[0], this.pointer[0], this.pointer[1])) {
        this.currentDrag = null;
        return;
      }

      this.toFront();

      if (! this.options.draggable) 
        return;
      this._notify("onStartMove");
    }    
    // Register global event to capture mouseUp and mouseMove
    $(document).on("mouseup", this, this.eventMouseUp);
    $(document).on("mousemove", this, this.eventMouseMove);
    
    // Add an invisible div to keep catching mouse event over iframes
    WindowUtilities.disableScreen('__invisible__', '__invisible__', this.overlayOpacity);

    // Stop selection while dragging
    document.body.ondrag = function () { return false; };
    document.body.onselectstart = function () { return false; };
    
    $(this.currentDrag).show();
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  
  Window.prototype._round = function(val, round) {
    return round == 1 ? val  : val = Math.floor(val / round) * round;
  };

  // updateDrag event
  Window.prototype._updateDrag = function(event) {
    var pointer =  [this._round(event.pageX, this.options.gridX), this._round(event.pageY, this.options.gridY)];  
    var dx = pointer[0] - this.pointer[0];
    var dy = pointer[1] - this.pointer[1];
    
    // Resize case, update width/height
    if (this.doResize) {
      var w = this.widthOrg + dx;
      var h = this.heightOrg + dy;
      
      dx = this.width - this.widthOrg;
      dy = this.height - this.heightOrg;
      
      // Check if it's a right position, update it to keep upper-left corner at the same position
      if (this.useLeft) 
        w = this._updateWidthConstraint(w);
      else 
        $(this.currentDrag).css({right: (this.rightOrg -dx) + 'px'});
      // Check if it's a bottom position, update it to keep upper-left corner at the same position
      if (this.useTop) 
        h = this._updateHeightConstraint(h);
      else
        $(this.currentDrag).css({bottom: (this.bottomOrg -dy) + 'px'});
        
      this.setSize(w , h);
      this._notify("onResize");
    }
    // Move case, update top/left
    else {
      this.pointer = pointer;
      
      if (this.useLeft) {
        var left =  parseFloat($(this.currentDrag).css('left')) + dx;
        var newLeft = this._updateLeftConstraint(left);
        // Keep mouse pointer correct
        this.pointer[0] += newLeft-left;
        $(this.currentDrag).css({left: newLeft + 'px'});
      }
      else 
        $(this.currentDrag).css({right: parseFloat($(this.currentDrag).css('right')) - dx + 'px'});
      
      if (this.useTop) {
        var top =  parseFloat($(this.currentDrag).css('top')) + dy;
        var newTop = this._updateTopConstraint(top);
        // Keep mouse pointer correct
        this.pointer[1] += newTop - top;
        $(this.currentDrag).css({top: newTop + 'px'});
      }
      else 
        $(this.currentDrag).css({bottom: parseFloat($(this.currentDrag).css('bottom')) - dy + 'px'});

      this._notify("onMove");
    }
    if (this.iefix) 
      this._fixIEOverlapping(); 
      
    this._removeStoreLocation();
    event.preventDefault();
    event.stopImmediatePropagation();
  };

   // endDrag callback
  Window.prototype._endDrag = function(event) {
    // Remove temporary div over iframes
     WindowUtilities.enableScreen('__invisible__');
    
    if (this.doResize)
      this._notify("onEndResize");
    else
      this._notify("onEndMove");
    
    // Release event observing
    $(document).off("mouseup", this.eventMouseUp);
    $(document).off("mousemove", this.eventMouseMove);

    event.preventDefault();
    event.stopImmediatePropagation();
    
    this._hideWiredElement();

    // Store new location/size if need be
    this._saveCookie();
      
    // Restore selection
    document.body.ondrag = null;
    document.body.onselectstart = null;
  };

  Window.prototype._updateLeftConstraint = function(left) {
    if (this.constraint && this.useLeft && this.useTop) {
      var width = this.options.parent == document.body ? WindowUtilities.getPageSize().windowWidth : $(this.options.parent).width();

      if (left < this.constraintPad.left)
        left = this.constraintPad.left;
      if (left + this.width + this.widthE + this.widthW > width - this.constraintPad.right) 
        left = width - this.constraintPad.right - this.width - this.widthE - this.widthW;
    }
    return left;
  };
  
  Window.prototype._updateTopConstraint = function(top) {
    if (this.constraint && this.useLeft && this.useTop) {        
      var height = this.options.parent == document.body ? WindowUtilities.getPageSize().windowHeight : $(this.options.parent).height();
      
      var h = this.height + this.heightN + this.heightS;

      if (top < this.constraintPad.top)
        top = this.constraintPad.top;
      if (top + h > height - this.constraintPad.bottom) 
        top = height - this.constraintPad.bottom - h;
    }
    return top;
  };
  
  Window.prototype._updateWidthConstraint = function(w) {
    if (this.constraint && this.useLeft && this.useTop) {
      var width = this.options.parent == document.body ? WindowUtilities.getPageSize().windowWidth : $(this.options.parent).width();
      var left =  parseFloat($(this.element).css("left"));

      if (left + w + this.widthE + this.widthW > width - this.constraintPad.right) 
        w = width - this.constraintPad.right - left - this.widthE - this.widthW;
    }
    return w;
  };
  
  Window.prototype._updateHeightConstraint = function(h) {
    if (this.constraint && this.useLeft && this.useTop) {
      var height = this.options.parent == document.body ? WindowUtilities.getPageSize().windowHeight : $(this.options.parent).height();
      var top =  parseFloat($(this.element).css("top"));

      if (top + h + this.heightN + this.heightS > height - this.constraintPad.bottom) 
        h = height - this.constraintPad.bottom - top - this.heightN - this.heightS;
    }
    return h;
  };
  
  
  // Creates HTML window code
  Window.prototype._createWindow = function(id) {
    var className = this.options.className;
    var win = document.createElement("div");
    win.setAttribute('id', id);
    win.className = "dialog";

    var content;
    if (this.options.url)
      content= "<iframe frameborder=\"0\" name=\"" + id + "_content\"  id=\"" + id + "_content\" src=\"" + this.options.url + "\"> </iframe>";
    else
      content ="<div id=\"" + id + "_content\" class=\"" +className + "_content\"> </div>";

    var closeDiv = this.options.closable ? "<div class='"+ className +"_close' id='"+ id +"_close' onclick='Windows.close(\""+ id +"\", event)'> </div>" : "";
    var minDiv = this.options.minimizable ? "<div class='"+ className + "_minimize' id='"+ id +"_minimize' onclick='Windows.minimize(\""+ id +"\", event)'> </div>" : "";
    var maxDiv = this.options.maximizable ? "<div class='"+ className + "_maximize' id='"+ id +"_maximize' onclick='Windows.maximize(\""+ id +"\", event)'> </div>" : "";
    var seAttributes = this.options.resizable ? "class='" + className + "_sizer' id='" + id + "_sizer'" : "class='"  + className + "_se'";
    var blank = "../themes/default/blank.gif";
    
    win.innerHTML = closeDiv + minDiv + maxDiv + "\
      <table id='"+ id +"_row1' class=\"top table_window\">\
        <tr>\
          <td class='"+ className +"_nw'></td>\
          <td class='"+ className +"_n'><div id='"+ id +"_top' class='"+ className +"_title title_window'>"+ this.options.title +"</div></td>\
          <td class='"+ className +"_ne'></td>\
        </tr>\
      </table>\
      <table id='"+ id +"_row2' class=\"mid table_window\">\
        <tr>\
          <td class='"+ className +"_w'></td>\
            <td id='"+ id +"_table_content' class='"+ className +"_content' valign='top'>" + content + "</td>\
          <td class='"+ className +"_e'></td>\
        </tr>\
      </table>\
        <table id='"+ id +"_row3' class=\"bot table_window\">\
        <tr>\
          <td class='"+ className +"_sw'></td>\
            <td class='"+ className +"_s'><div id='"+ id +"_bottom' class='status_bar'><span style='float:left; width:1px; height:1px'></span></div></td>\
            <td " + seAttributes + "></td>\
        </tr>\
      </table>\
    ";
    $(win).hide();
    this.options.parent.insertBefore(win, this.options.parent.firstChild);
    $('#' + id + "_content").on("load", this.options.onload);
    return win;
  };
  
  
  Window.prototype.changeClassName = function(newClassName) {
    var className = this.options.className;
    var id = this.getId();
    var win = this;
    $.each(["_close","_minimize","_maximize","_sizer", "_content"], function(i, value) { win._toggleClassName($('#' + id + value), className + value, newClassName + value); });
    $.each($("#" + id + " td"), function(i, td) {td.className = td.className.sub(className,newClassName); });
    this.options.className = newClassName;
    this._getWindowBorderSize();    
    this.setSize(this.width, this.height)
  };
  
  Window.prototype._toggleClassName = function(element, oldClassName, newClassName) {
    if (element.length) {
      element.removeClass(oldClassName);
      element.addClass(newClassName);
    }
  };
  
  // Sets window location
  Window.prototype.setLocation = function(top, left) {
    top = this._updateTopConstraint(top);
    left = this._updateLeftConstraint(left);

    var e = this.currentDrag || this.element;
    $(e).css('top', top + 'px');
    $(e).css('left', left + 'px');

    this.useLeft = true;
    this.useTop = true;
  };
    
  Window.prototype.getLocation = function() {
    var location = {};
    if (this.useTop)
      location = $.extend(location, {top: $(this.element).css("top")});
    else
      location = $.extend(location, {bottom: $(this.element).css("bottom")});
    if (this.useLeft)
      location = $.extend(location, {left: $(this.element).css("left")});
    else
      location = $.extend(location, {right: $(this.element).css("right")});
    
    return location;
  };
  
  // Gets window size
  Window.prototype.getSize = function() {
    return {width: this.width, height: this.height};
  };
    
  // Sets window size
  Window.prototype.setSize = function(width, height, useEffect) {    
    width = parseFloat(width);
    height = parseFloat(height);
    
    // Check min and max size
    if (!this.minimized && width < this.options.minWidth)
      width = this.options.minWidth;

    if (!this.minimized && height < this.options.minHeight)
      height = this.options.minHeight;
      
    if (this.options. maxHeight && height > this.options. maxHeight)
      height = this.options. maxHeight;

    if (this.options. maxWidth && width > this.options. maxWidth)
      width = this.options. maxWidth;

    
    if (this.useTop && this.useLeft && Window.hasEffectLib && Effect.ResizeWindow && useEffect) {
      new Effect.ResizeWindow(this, null, null, width, height, {duration: Window.resizeEffectDuration});
    } else {
      this.width = width;
      this.height = height;
      var e = this.currentDrag ? this.currentDrag : this.element;
      
      $(e).width(width + this.widthW + this.widthE + "px");
      $(e).height(height  + this.heightN + this.heightS + "px");

      // Update content size
      if (!this.currentDrag || this.currentDrag == this.element) {
        var content = $('#' + this.element.id + '_content');
        content.height(height  + 'px');
        content.width(width  + 'px');
      }
    }
  };
  
  Window.prototype.updateHeight = function() {
    this.setSize(this.width, this.content.scrollHeight, true);
  };
  
  Window.prototype.updateWidth = function() {
    this.setSize(this.content.scrollWidth, this.height, true);
  };
  
  // Brings window to front
  Window.prototype.toFront = function() {
    if (this.element.style.zIndex < Windows.maxZIndex)  
      this.setZIndex(Windows.maxZIndex + 1);
    if (this.iefix) 
      this._fixIEOverlapping(); 
  };
   
  Window.prototype.getBounds = function(insideOnly) {
    if (! this.width || !this.height || !this.visible)  
      this.computeBounds();
    var w = this.width;
    var h = this.height;

    if (!insideOnly) {
      w += this.widthW + this.widthE;
      h += this.heightN + this.heightS;
    }
    var bounds = Object.extend(this.getLocation(), {width: w + "px", height: h + "px"});
    return bounds;
  }; 
      
  Window.prototype.computeBounds = function() {
     if (! this.width || !this.height) {
      var size = WindowUtilities._computeSize(this.content.innerHTML, this.content.id, this.width, this.height, 0, this.options.className)
      if (this.height)
        this.width = size + 5
      else
        this.height = size + 5
    }

    this.setSize(this.width, this.height);
    if (this.centered)
      this._center(this.centerTop, this.centerLeft);    
  },
  
  // Displays window modal state or not
  Window.prototype.show = function(modal) {
    this.visible = true;
    if (modal) {
      // Hack for Safari !!
      if (typeof this.overlayOpacity == "undefined") {
        var that= this;
        setTimeout(function() {that.show(modal);}, 10);
        return;
      }
      Windows.addModalWindow(this);
      
      this.modal = true;      
      this.setZIndex(Windows.maxZIndex + 1);
      Windows.unsetOverflow(this);
    }
    else
      if (!this.element.style.zIndex) 
        this.setZIndex(Windows.maxZIndex++ + 1);        
      
    // To restore overflow if need be
    if (this.oldStyle)
      $(this.getContent()).css({overflow: this.oldStyle});
      
    this.computeBounds();
    
    this._notify("onBeforeShow");   
    if (this.options.showEffect != this.defaultShowEffect && this.options.showEffectOptions)
      this.options.showEffect(this.element, this.options.showEffectOptions);  
    else
      this.options.showEffect(this.element);  
      
    this._checkIEOverlapping();
    WindowUtilities.focusedWindow = this;
    this._notify("onShow");   
  };
  
  // Displays window modal state or not at the center of the page
  Window.prototype.showCenter = function(modal, top, left) {
    this.centered = true;
    this.centerTop = top;
    this.centerLeft = left;

    this.show(modal);
  };
  
  Window.prototype.isVisible = function() {
    return this.visible;
  };
  
  Window.prototype._center = function(top, left) {
    var windowScroll = WindowUtilities.getWindowScroll(this.options.parent);    
    var pageSize = WindowUtilities.getPageSize(this.options.parent);    
    if (typeof top == "undefined")
      top = (pageSize.windowHeight - (this.height + this.heightN + this.heightS))/2;
    top += windowScroll.top;
    
    if (typeof left == "undefined")
      left = (pageSize.windowWidth - (this.width + this.widthW + this.widthE))/2;
    left += windowScroll.left; 
    
    this.setLocation(top, left);
    this.toFront();
  };
  
  Window.prototype._recenter = function(event) {
    if (this.centered) {
      var pageSize = WindowUtilities.getPageSize(this.options.parent);
      var windowScroll = WindowUtilities.getWindowScroll(this.options.parent);    

      // Check for this stupid IE that sends dumb events
      if (this.pageSize && this.pageSize.windowWidth == pageSize.windowWidth && this.pageSize.windowHeight == pageSize.windowHeight && 
          this.windowScroll.left == windowScroll.left && this.windowScroll.top == windowScroll.top) 
        return;
      this.pageSize = pageSize;
      this.windowScroll = windowScroll;
      // set height of Overlay to take up whole page and show
      if ($('#overlay_modal').length) 
        $('#overlay_modal').css({height: (pageSize.pageHeight + 'px')});
      
      if (this.options.recenterAuto)
        this._center(this.centerTop, this.centerLeft);    
    }
  };
  
  // Hides window
  Window.prototype.hide = function() {
    this.visible = false;
    if (this.modal) {
      Windows.removeModalWindow(this);
      Windows.resetOverflow();
    }
    // To avoid bug on scrolling bar
    this.oldStyle = $(this.getContent()).css('overflow') || "auto";
    $(this.getContent()).css({overflow: "hidden"});

    this.options.hideEffect(this.element, this.options.hideEffectOptions);  

     if(this.iefix) 
      $(this.iefix).hide();

    if (!this.doNotNotifyHide)
      this._notify("onHide");
  };

  Window.prototype.close = function() {
    // Asks closeCallback if exists
    if (this.visible) {
      if (this.options.closeCallback && ! this.options.closeCallback(this)) 
        return;

      if (this.options.destroyOnClose) {
        var destroyFunc = $.proxy(this.destroy, this);
        if (this.options.hideEffectOptions.afterFinish) {
          var func = this.options.hideEffectOptions.afterFinish;
          this.options.hideEffectOptions.afterFinish = function() {func();destroyFunc(); };
        }
        else 
          this.options.hideEffectOptions.afterFinish = function() {destroyFunc(); };
      }
      Windows.updateFocusedWindow();
      
      this.doNotNotifyHide = true;
      this.hide();
      this.doNotNotifyHide = false;
      this._notify("onClose");
    }
  };
  
  Window.prototype.minimize = function() {
    if (this.isMaximized() || this.resizing)
      return;

    // Backward compatibility
    if (this.minimized) {
      this.restore();
      return;
    }
    var r2 = $('#' + this.getId() + "_row2");
    this.minimized = true;

    var dh = r2.height();
    this.r2Height = dh;
    var h  = this.element.getHeight() - dh;

    if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow) {
      new Effect.ResizeWindow(this, null, null, null, this.height -dh, {duration: Window.resizeEffectDuration});
    } else  {
      this.height -= dh;
      $(this.element).css({height: h + "px"});
      r2.hide();
    }
    if (! this.useTop) {
      var bottom = parseFloat($(this.element).css('bottom'));
      $(this.element).css({bottom: (bottom + dh) + 'px'});
    }
    this._notify("onMinimize");
    
    // Store new location/size if need be
    this._saveCookie();
  };
    
  Window.prototype.restore = function() {
    if (!this.minimized || this.resizing)
      return;                            
      
    var r2 = $('#' + this.getId() + "_row2");
    this.minimized = false;
    
    var dh = this.r2Height;
    this.r2Height = null;
    if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow) {
      new Effect.ResizeWindow(this, null, null, null, this.height + dh, {duration: Window.resizeEffectDuration});
    }
    else {
      var h  = this.element.getHeight() + dh;
      this.height += dh;
      $(this.element).css({height: h + "px"})
      r2.show();
    }
    if (! this.useTop) {
      var bottom = parseFloat($(this.element).css('bottom'));
      $(this.element).css({bottom: (bottom - dh) + 'px'});
    }
    this.toFront();    
    
    // Store new location/size if need be
    this._saveCookie();
  };
  
  Window.prototype.maximize = function() {
    if (this.isMinimized() || this.resizing)
      return;

    if (window.ie && this.heightN == 0)
      this._getWindowBorderSize();
      
    if (this.storedLocation != null) {
      this._restoreLocation();
      if(this.iefix) 
        $(this.iefix).hide();
    }
    else {
      this._storeLocation();
      Windows.unsetOverflow(this);
      
      var windowScroll = WindowUtilities.getWindowScroll(this.options.parent);
      var pageSize = WindowUtilities.getPageSize(this.options.parent);    
      var left = windowScroll.left;
      var top = windowScroll.top;
      
      if (this.options.parent != document.body) {
        windowScroll =  {top:0, left:0, bottom:0, right:0};
        var dim = this.options.parent.getDimensions();
        pageSize.windowWidth = dim.width;
        pageSize.windowHeight = dim.height;
        top = 0; 
        left = 0;
      }
      
      if (this.constraint) {
        pageSize.windowWidth -= Math.max(0, this.constraintPad.left) + Math.max(0, this.constraintPad.right);
        pageSize.windowHeight -= Math.max(0, this.constraintPad.top) + Math.max(0, this.constraintPad.bottom);
        left +=  Math.max(0, this.constraintPad.left);
        top +=  Math.max(0, this.constraintPad.top);
      }
      
      var width = pageSize.windowWidth - this.widthW - this.widthE;
      var height= pageSize.windowHeight - this.heightN - this.heightS;

      if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow) {
        new Effect.ResizeWindow(this, top, left, width, height, {duration: Window.resizeEffectDuration});
      }
      else {
        this.setSize(width, height);
        $(this.element).css(this.useLeft ? {left: left} : {right: left});
        $(this.element).css(this.useTop ? {top: top} : {bottom: top});
      }
        
      this.toFront();
      if (this.iefix) 
        this._fixIEOverlapping(); 
    }
    this._notify("onMaximize");

    // Store new location/size if need be
    this._saveCookie();
  };
  
  Window.prototype.isMinimized = function() {
    return this.minimized;
  };
  
  Window.prototype.isMaximized = function() {
    return (this.storedLocation != null);
  };
  
  Window.prototype.setOpacity = function(opacity) {
    if (Element.setOpacity)
      $(this.element).css({ opacity: opacity });
  };
  
  Window.prototype.setZIndex = function(zindex) {
    $(this.element).css('zIndex', zindex);
    Windows.updateZindex(zindex, this);
  };

  Window.prototype.setTitle = function(newTitle) {
    if (!newTitle || newTitle == "") 
      newTitle = "&nbsp;";
      
    $('#' + this.element.id + '_top').html(newTitle);
  };
   
  Window.prototype.getTitle = function() {
    return $('#' + this.element.id + '_top')[0].innerHTML;
  };
  
  Window.prototype.setStatusBar = function(element) {
    var statusBar = $('#' + this.getId() + "_bottom")[0];

    if (typeof(element) == "object") {
      if (this.bottombar.firstChild)
        this.bottombar.replaceChild(element, this.bottombar.firstChild);
      else
        this.bottombar.appendChild(element);
    }
    else
      this.bottombar.innerHTML = element;
  };

  Window.prototype._checkIEOverlapping = function() {
    if(!this.iefix && (navigator.appVersion.indexOf('MSIE')>0) && (navigator.userAgent.indexOf('Opera')<0) && ($(this.element).css('position')=='absolute')) {
        new Insertion.After(this.element.id, '<iframe id="' + this.element.id + '_iefix" '+ 'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' + 'src="javascript:false;" frameborder="0" scrolling="no"></iframe>');
        this.iefix = $('#' + this.element.id+'_iefix')[0];
    }
    if(this.iefix) 
      setTimeout(this._fixIEOverlapping.bind(this), 50);
  };

  Window.prototype._fixIEOverlapping = function() {
      this.iefix.left = this.element.left;
      this.iefix.top = this.element.top;
      this.iefix.width = this.element.width;
      this.iefix.height = this.element.height;
      this.iefix.style.zIndex = this.element.style.zIndex - 1;
      $(this.iefix).show();
  };
  
  Window.prototype._getWindowBorderSize = function(event) {
    // Hack to get real window border size!!
    var div = this._createHiddenDiv(this.options.className + "_n");
    this.heightN = $(div).height();    
    div.parentNode.removeChild(div);

    var div = this._createHiddenDiv(this.options.className + "_s");
    this.heightS = $(div).height();    
    div.parentNode.removeChild(div);

    var div = this._createHiddenDiv(this.options.className + "_e");
    this.widthE = $(div).width();    
    div.parentNode.removeChild(div);

    var div = this._createHiddenDiv(this.options.className + "_w");
    this.widthW = $(div).width();
    div.parentNode.removeChild(div);
    
    var div = document.createElement("div");
    div.className = "overlay_" + this.options.className ;
    document.body.appendChild(div);
    //alert("no timeout:\nopacity: " + div.css("opacity") + "\nwidth: " + document.defaultView.getComputedStyle(div, null).width);
    var that = this;
    
    // Workaround for Safari!!
    setTimeout(function() {that.overlayOpacity = ($(div).css("opacity")); div.parentNode.removeChild(div);}, 10);
    
    // Workaround for IE!!
    if (window.ie) {
      this.heightS = $('#' + this.getId() +"_row3").height();
      this.heightN = $('#' + this.getId() +"_row1").height();
    }

    // Safari size fix
    if (window.khtml && !window.webkit)
      this.setSize(this.width, this.height);
    if (this.doMaximize)
      this.maximize();
    if (this.doMinimize)
      this.minimize();
  };
 
  Window.prototype._createHiddenDiv = function(className) {
    var objBody = document.body;
    var win = document.createElement("div");
    win.setAttribute('id', this.element.id+ "_tmp");
    win.className = className;
    win.style.display = 'none';
    win.innerHTML = '';
    objBody.insertBefore(win, objBody.firstChild);
    return win;
  };
  
  Window.prototype._storeLocation = function() {
    if (this.storedLocation == null) {
      this.storedLocation = {useTop: this.useTop, useLeft: this.useLeft, 
                             top: $(this.element).css('top'), bottom: $(this.element).css('bottom'),
                             left: $(this.element).css('left'), right: $(this.element).css('right'),
                             width: this.width, height: this.height };
    }
  };
  
  Window.prototype._restoreLocation = function() {
    if (this.storedLocation != null) {
      this.useLeft = this.storedLocation.useLeft;
      this.useTop = this.storedLocation.useTop;
      
      if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow)
        new Effect.ResizeWindow(this, this.storedLocation.top, this.storedLocation.left, this.storedLocation.width, this.storedLocation.height, {duration: Window.resizeEffectDuration});
      else {
        $(this.element).css(this.useLeft ? {left: this.storedLocation.left} : {right: this.storedLocation.right});
        $(this.element).css(this.useTop ? {top: this.storedLocation.top} : {bottom: this.storedLocation.bottom});
        this.setSize(this.storedLocation.width, this.storedLocation.height);
      }
      
      Windows.resetOverflow();
      this._removeStoreLocation();
    }
  };
  
  Window.prototype._removeStoreLocation = function() {
    this.storedLocation = null;
  };
  
  Window.prototype._saveCookie = function() {
    if (this.cookie) {
      var value = "";
      if (this.useLeft)
        value += "l:" +  (this.storedLocation ? this.storedLocation.left : $(this.element).css('left'));
      else
        value += "r:" + (this.storedLocation ? this.storedLocation.right : $(this.element).css('right'));
      if (this.useTop)
        value += ",t:" + (this.storedLocation ? this.storedLocation.top : $(this.element).css('top'));
      else
        value += ",b:" + (this.storedLocation ? this.storedLocation.bottom :$(this.element).css('bottom'));
        
      value += "," + (this.storedLocation ? this.storedLocation.width : this.width);
      value += "," + (this.storedLocation ? this.storedLocation.height : this.height);
      value += "," + this.isMinimized();
      value += "," + this.isMaximized();
      WindowUtilities.setCookie(value, this.cookie);
    }
  };
  
  Window.prototype._createWiredElement = function() {
    if (! this.wiredElement) {
      if (window.ie)
        this._getWindowBorderSize();
      var div = document.createElement("div");
      div.className = "wired_frame " + this.options.className + "_wired_frame";
      
      div.style.position = 'absolute';
      this.options.parent.insertBefore(div, this.options.parent.firstChild);
      this.wiredElement = div;
    }
    if (this.useLeft) 
      $(this.wiredElement).css({left: $(this.element).css('left')});
    else 
      $(this.wiredElement).css({right: $(this.element).css('right')});
      
    if (this.useTop) 
      $(this.wiredElement).css({top: $(this.element).css('top')});
    else 
      $(this.wiredElement).css({bottom: $(this.element).css('bottom')});

    var dim = $(this.element).getDimensions();
    $(this.wiredElement).css({width: dim.width + "px", height: dim.height +"px"});

    $(this.wiredElement).css({zIndex: Windows.maxZIndex+30});
    return this.wiredElement;
  };
  
  Window.prototype._hideWiredElement = function() {
    if (! this.wiredElement || ! this.currentDrag)
      return;
    if (this.currentDrag == this.element) 
      this.currentDrag = null;
    else {
      if (this.useLeft) 
         $(this.element).css({left: $(this.currentDrag).css('left')});
      else 
         $(this.element).css({right: $(this.currentDrag).css('right')});

      if (this.useTop) 
         $(this.element).css({top: $(this.currentDrag).css('top')});
      else 
        $(this.element).css({bottom: $(this.currentDrag).css('bottom')});

      $(this.currentDrag).hide();
      this.currentDrag = null;
      if (this.doResize)
        this.setSize(this.width, this.height);
    } 
  };
  
  Window.prototype._notify = function(eventName) {
    if (this.options[eventName])
      this.options[eventName](this);
    else
      Windows.notify(eventName, this);
  };

// Windows containers, register all page windows
var Windows = {
  windows: [],
  modalWindows: [],
  observers: [],
  focusedWindow: null,
  maxZIndex: 0,
  overlayShowEffectOptions: {duration: 0.5},
  overlayHideEffectOptions: {duration: 0.5},

  addObserver: function(observer) {
    this.removeObserver(observer);
    this.observers.push(observer);
  },
  
  removeObserver: function(observer) {  
     this.observers = this.observers.filter( function() { return this!=observer; });
  },
  
  //  onDestroy onStartResize onStartMove onResize onMove onEndResize onEndMove onFocus onBeforeShow onShow onHide onMinimize onMaximize onClose
  notify: function(eventName, win) { 
    $.each(this.observers, function(i, o) {if(o[eventName]) o[eventName](eventName, win);});
  },

  // Gets window from its id
  getWindow: function(id) {
    for (var w=0; w < this.windows.length; ++w) {
       if (this.windows[w].getId() == id) {
          return this.windows[w];
       }
    }
    return null;
  },

  // Gets the last focused window
  getFocusedWindow: function() {
    return this.focusedWindow;
  },

  updateFocusedWindow: function() {
    this.focusedWindow = this.windows.length >=2 ? this.windows[this.windows.length-2] : null;    
  },
  
  // Add a modal window in the stack
  addModalWindow: function(win) {
    // Disable screen if first modal window
    if (this.modalWindows.length == 0) {
      WindowUtilities.disableScreen(win.options.className, 'overlay_modal', win.overlayOpacity, win.getId(), win.options.parent);
    }
    else {
      // Move overlay over all windows
      if (Window.keepMultiModalWindow) {
        $('#overlay_modal')[0].style.zIndex = Windows.maxZIndex + 1;
        Windows.maxZIndex += 1;
        WindowUtilities._hideSelect(this.modalWindows[this.modalWindows.length-1].getId());
      }
      // Hide current modal window
      else
         this.modalWindows[this.modalWindows.length-1].element.hide();
      // Fucking IE select issue
      WindowUtilities._showSelect(win.getId());
    }      
    this.modalWindows.push(win);    
  },
  
  removeModalWindow: function(win) {
    this.modalWindows.pop();
    
    // No more modal windows
    if (this.modalWindows.length == 0)
      WindowUtilities.enableScreen();     
    else {
      if (Window.keepMultiModalWindow) {
        this.modalWindows.unshift(this.modalWindows[this.modalWindows.length-1]);
        this.modalWindows.pop();
        WindowUtilities._showSelect(this.modalWindows[this.modalWindows.length-1].getId());        
      }
      else
         this.modalWindows[this.modalWindows.length-1].element.show();
    }
  },
  
  // Registers a new window (called by Windows constructor)
  register: function(win) {
    this.windows.push(win);
  },
  
  // Unregisters a window (called by Windows destructor)
  unregister: function(win) {
    this.windows = $(this.windows).filter( function() { return this!=win; });
  }, 
  
  // Closes all windows
  closeAll: function() {  
    $.each( this.windows, function(i, w) {Windows.close(w.getId());} );
  },
  
  closeAllModalWindows: function() {
    WindowUtilities.enableScreen();     
    $.each( this.modalWindows, function(i, win) {if (win) win.close();});    
  },

  // Minimizes a window with its id
  minimize: function(id, event) {
    var win = this.getWindow(id);
    if (win && win.visible)
      win.minimize();
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  
  // Maximizes a window with its id
  maximize: function(id, event) {
    var win = this.getWindow(id);
    if (win && win.visible)
      win.maximize();
    event.preventDefault();
    event.stopImmediatePropagation();
  },

  // Closes a window with its id
  close: function(id, event) {
    var win = this.getWindow(id);
    if (win) 
      win.close();
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  
  blur: function(id) {
    var win = this.getWindow(id);  
    if (!win)
      return;
    if (win.options.blurClassName)
      win.changeClassName(win.options.blurClassName);
    if (this.focusedWindow == win)  
      this.focusedWindow = null;
    win._notify("onBlur");  
  },
  
  focus: function(id) {
    var win = this.getWindow(id);  
    if (!win)
      return;       
    if (this.focusedWindow)
      this.blur(this.focusedWindow.getId())

    if (win.options.focusClassName)
      win.changeClassName(win.options.focusClassName);  
    this.focusedWindow = win;
    win._notify("onFocus");
  },
  
  unsetOverflow: function(except) {    
    $.each(this.windows, function(i, d) { d.oldOverflow = $(d.getContent()).css("overflow") || "auto" ; $(d.getContent()).css({overflow: "hidden"}); });
    if (except && except.oldOverflow)
      $(except.getContent()).css({overflow: except.oldOverflow});
  },

  resetOverflow: function() {
    $.each(this.windows, function(i, d) { if (d.oldOverflow) $(d.getContent()).css({overflow: d.oldOverflow}); });
  },

  updateZindex: function(zindex, win) { 
    if (zindex > this.maxZIndex) {   
      this.maxZIndex = zindex;    
      if (this.focusedWindow) 
        this.blur(this.focusedWindow.getId())
    }
    this.focusedWindow = win;
    if (this.focusedWindow) 
      this.focus(this.focusedWindow.getId())
  }
};

var Dialog = {
  dialogId: null,
  onCompleteFunc: null,
  callFunc: null, 
  parameters: null, 
    
  confirm: function(content, parameters) {
    // Get Ajax return before
    if (content && typeof content != "string") {
      Dialog._runAjaxRequest(content, parameters, Dialog.confirm);
      return 
    }
    content = content || "";
    
    parameters = parameters || {};
    var okLabel = parameters.okLabel ? parameters.okLabel : "Ok";
    var cancelLabel = parameters.cancelLabel ? parameters.cancelLabel : "Cancel";

    // Backward compatibility
    parameters = $.extend(parameters, parameters.windowParameters || {});
    parameters.windowParameters = parameters.windowParameters || {};

    parameters.className = parameters.className || "alert";

    var okButtonClass = "class ='" + (parameters.buttonClass ? parameters.buttonClass + " " : "") + " ok_button'"; 
    var cancelButtonClass = "class ='" + (parameters.buttonClass ? parameters.buttonClass + " " : "") + " cancel_button'"; 
    var content = "\
      <div class='" + parameters.className + "_message'>" + content  + "</div>\
        <div class='" + parameters.className + "_buttons'>\
          <input type='button' value='" + okLabel + "' onclick='Dialog.okCallback()' " + okButtonClass + "/>\
          <input type='button' value='" + cancelLabel + "' onclick='Dialog.cancelCallback()' " + cancelButtonClass + "/>\
        </div>\
    ";
    return this._openDialog(content, parameters);
  },
  
  alert: function(content, parameters) {
    // Get Ajax return before
    if (content && typeof content != "string") {
      Dialog._runAjaxRequest(content, parameters, Dialog.alert);
      return 
    }
    content = content || "";
    
    parameters = parameters || {};
    var okLabel = parameters.okLabel ? parameters.okLabel : "Ok";

    // Backward compatibility    
    parameters = $.extend(parameters, parameters.windowParameters || {});
    parameters.windowParameters = parameters.windowParameters || {};
    
    parameters.className = parameters.className || "alert";
    
    var okButtonClass = "class ='" + (parameters.buttonClass ? parameters.buttonClass + " " : "") + " ok_button'"; 
    var content = "\
      <div class='" + parameters.className + "_message'>" + content  + "</div>\
        <div class='" + parameters.className + "_buttons'>\
          <input type='button' value='" + okLabel + "' onclick='Dialog.okCallback()' " + okButtonClass + "/>\
        </div>";
    return this._openDialog(content, parameters);
  },
  
  info: function(content, parameters) {   
    // Get Ajax return before
    if (content && typeof content != "string") {
      Dialog._runAjaxRequest(content, parameters, Dialog.info);
      return 
    }
    content = content || "";
     
    // Backward compatibility
    parameters = parameters || {};
    parameters = $.extend(parameters, parameters.windowParameters || {});
    parameters.windowParameters = parameters.windowParameters || {};
    
    parameters.className = parameters.className || "alert";
    
    var content = "<div id='modal_dialog_message' class='" + parameters.className + "_message'>" + content  + "</div>";
    if (parameters.showProgress)
      content += "<div id='modal_dialog_progress' class='" + parameters.className + "_progress'>  </div>";

    parameters.ok = null;
    parameters.cancel = null;
    
    return this._openDialog(content, parameters);
  },
  
  setInfoMessage: function(message) {
    $('#modal_dialog_message')[0].update(message);
  },
  
  closeInfo: function() {
    Windows.close(this.dialogId);
  },
  
  _openDialog: function(content, parameters) {
    var className = parameters.className;
    
    if (! parameters.height && ! parameters.width) {
      parameters.width = WindowUtilities.getPageSize((parameters.options && parameters.options.parent) || document.body).pageWidth / 2;
    }
    if (parameters.id)
      this.dialogId = parameters.id;
    else { 
      var t = new Date();
      this.dialogId = 'modal_dialog_' + t.getTime();
      parameters.id = this.dialogId;
    }

    // compute height or width if need be
    if (! parameters.height || ! parameters.width) {
      var size = WindowUtilities._computeSize(content, this.dialogId, parameters.width, parameters.height, 5, className);
      if (parameters.height)
        parameters.width = size + 5;
      else
        parameters.height = size + 5;
    }
    parameters.effectOptions = parameters.effectOptions ;
    parameters.resizable   = parameters.resizable || false;
    parameters.minimizable = parameters.minimizable || false;
    parameters.maximizable = parameters.maximizable ||  false;
    parameters.draggable   = parameters.draggable || false;
    parameters.closable    = parameters.closable || false;
    
    var win = new Window(parameters);   
    if (!parameters.url) {
      win.setHTMLContent(content);
    }
    win.showCenter(true, parameters.top, parameters.left);  
    win.setDestroyOnClose();
    
    win.cancelCallback = parameters.onCancel || parameters.cancel; 
    win.okCallback = parameters.onOk || parameters.ok;
    
    return win;    
  },
  
  _getAjaxContent: function(originalRequest)  {
    Dialog.callFunc(originalRequest.responseText, Dialog.parameters);
  },
  
  _runAjaxRequest: function(message, parameters, callFunc) {
    if (message.options == null)
      message.options = {};  
    Dialog.onCompleteFunc = message.options.onComplete;
    Dialog.parameters = parameters;
    Dialog.callFunc = callFunc;
    
    message.options.onComplete = Dialog._getAjaxContent;
    new $.ajax(message.url, message.options);
  },
  
  okCallback: function() {
    var win = Windows.focusedWindow;
    if (!win.okCallback || win.okCallback(win)) {
      // Remove onclick on button
      $.each($("#"+win.getId()+" input"), function(i, element) {element.onclick=null;});
      win.close();
    }
  },

  cancelCallback: function() {
    var win = Windows.focusedWindow;
    // Remove onclick on button
    $.each($("#"+win.getId()+" input"), function(i, element) {element.onclick=null;});
    win.close();
    if (win.cancelCallback)
      win.cancelCallback(win);
  }
}
/*
  Based on Lightbox JS: Fullsize Image Overlays 
  by Lokesh Dhakar - http://www.huddletogether.com

  For more information on this script, visit:
  http://huddletogether.com/projects/lightbox/

  Licensed under the Creative Commons Attribution 2.5 License - http://creativecommons.org/licenses/by/2.5/
  (basically, do anything you want, just leave my name and link)
*/

// From mootools.net
// window.ie - will be set to true if the current browser is internet explorer (any).
// window.ie6 - will be set to true if the current browser is internet explorer 6.
// window.ie7 - will be set to true if the current browser is internet explorer 7.
// window.khtml - will be set to true if the current browser is Safari/Konqueror.
// window.webkit - will be set to true if the current browser is Safari-WebKit (Safari3)
// window.gecko - will be set to true if the current browser is Mozilla/Gecko.
if (window.ActiveXObject) window.ie = window[window.XMLHttpRequest ? 'ie7' : 'ie6'] = true;
else if (document.childNodes && !document.all && !navigator.taintEnabled) window.khtml = true;
else if (document.getBoxObjectFor != null) window.gecko = true;
{
  var array = navigator.userAgent.match(new RegExp(/AppleWebKit\/([\d\.\+]*)/));
  window.webkit =  array && array.length == 2 ? parseFloat(array[1]) >= 420 : false;
}


var WindowUtilities = {  
  // From dragdrop.js
  getWindowScroll: function(parent) {
    var T, L, W, H;
    parent = parent || document.body;              
    if (parent != document.body) {
      T = parent.scrollTop;
      L = parent.scrollLeft;
      W = parent.scrollWidth;
      H = parent.scrollHeight;
    } 
    else {
      var w = window;
      with (w.document) {
        if (w.document.documentElement && documentElement.scrollTop) {
          T = documentElement.scrollTop;
          L = documentElement.scrollLeft;
        } else if (w.document.body) {
          T = body.scrollTop;
          L = body.scrollLeft;
        }
        if (w.innerWidth) {
          W = w.innerWidth;
          H = w.innerHeight;
        } else if (w.document.documentElement && documentElement.clientWidth) {
          W = documentElement.clientWidth;
          H = documentElement.clientHeight;
        } else {
          W = body.offsetWidth;
          H = body.offsetHeight
        }
      }
    }
    return { top: T, left: L, width: W, height: H };
  }, 
  //
  // getPageSize()
  // Returns array with page width, height and window width, height
  // Core code from - quirksmode.org
  // Edit for Firefox by pHaez
  //
  getPageSize: function(parent){
    parent = parent || document.body;              
    var windowWidth, windowHeight;
    var pageHeight, pageWidth;
    if (parent != document.body) {
      windowWidth = parent.getWidth();
      windowHeight = parent.getHeight();                                
      pageWidth = parent.scrollWidth;
      pageHeight = parent.scrollHeight;                                
    } 
    else {
      var xScroll, yScroll;

      if (window.innerHeight && window.scrollMaxY) {  
        xScroll = document.body.scrollWidth;
        yScroll = window.innerHeight + window.scrollMaxY;
      } else if (document.body.scrollHeight > document.body.offsetHeight){ // all but Explorer Mac
        xScroll = document.body.scrollWidth;
        yScroll = document.body.scrollHeight;
      } else { // Explorer Mac...would also work in Explorer 6 Strict, Mozilla and Safari
        xScroll = document.body.offsetWidth;
        yScroll = document.body.offsetHeight;
      }


      if (self.innerHeight) {  // all except Explorer
        windowWidth = self.innerWidth;
        windowHeight = self.innerHeight;
      } else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
        windowWidth = document.documentElement.clientWidth;
        windowHeight = document.documentElement.clientHeight;
      } else if (document.body) { // other Explorers
        windowWidth = document.body.clientWidth;
        windowHeight = document.body.clientHeight;
      }  

      // for small pages with total height less then height of the viewport
      if(yScroll < windowHeight){
        pageHeight = windowHeight;
      } else { 
        pageHeight = yScroll;
      }

      // for small pages with total width less then width of the viewport
      if(xScroll < windowWidth){  
        pageWidth = windowWidth;
      } else {
        pageWidth = xScroll;
      }
    }
    return {pageWidth: pageWidth ,pageHeight: pageHeight , windowWidth: windowWidth, windowHeight: windowHeight};
  },

  disableScreen: function(className, overlayId, overlayOpacity, contentId, parent) {
    var that = this;
    WindowUtilities.initLightbox(overlayId, className, function() {that._disableScreen(className, overlayId, overlayOpacity, contentId);});
  },

  _disableScreen: function(className, overlayId, overlayOpacity, contentId) {
    // prep objects
    var objOverlay = $('#' + overlayId)[0];

    var pageSize = WindowUtilities.getPageSize(objOverlay.parentNode);

    // Hide select boxes as they will 'peek' through the image in IE, store old value
    if (contentId && window.ie) {
      WindowUtilities._hideSelect();
      WindowUtilities._showSelect(contentId);
    }  
  
    // set height of Overlay to take up whole page and show
    objOverlay.style.height = (pageSize.pageHeight + 'px');
    objOverlay.style.display = 'none'; 
    if (overlayId == "overlay_modal" && Window.hasEffectLib && Windows.overlayShowEffectOptions) {
      objOverlay.overlayOpacity = overlayOpacity;
      new Effect.Appear(objOverlay, $.extend({from: 0, to: overlayOpacity}, Windows.overlayShowEffectOptions));
    }
    else
      objOverlay.style.display = "block";
  },
  
  enableScreen: function(id) {
    id = id || 'overlay_modal';
    var objOverlay =  $('#' + id);
    if (objOverlay.length) {
      // hide lightbox and overlay
      if (id == "overlay_modal" && Window.hasEffectLib && Windows.overlayHideEffectOptions)
        new Effect.Fade(objOverlay[0], $.extend({from: objOverlay[0].overlayOpacity, to:0}, Windows.overlayHideEffectOptions));
      else {
        objOverlay[0].style.display = 'none';
        objOverlay[0].parentNode.removeChild(objOverlay[0]);
      }
      
      // make select boxes visible using old value
      if (id != "__invisible__") 
        WindowUtilities._showSelect();
    }
  },

  _hideSelect: function(id) {
    if (window.ie) {
      id = id ==  null ? "" : "#" + id + " ";
      $.each($(id + 'select'), function(i, element) {
        if (! WindowUtilities.isDefined(element.oldVisibility)) {
          element.oldVisibility = element.style.visibility ? element.style.visibility : "visible";
          element.style.visibility = "hidden";
        }
      });
    }
  },
  
  _showSelect: function(id) {
    if (window.ie) {
      id = id ==  null ? "" : "#" + id + " ";
      $.each($(id + 'select'), function(i, element) {
        if (WindowUtilities.isDefined(element.oldVisibility)) {
          // Why?? Ask IE
          try {
            element.style.visibility = element.oldVisibility;
          } catch(e) {
            element.style.visibility = "visible";
          }
          element.oldVisibility = null;
        }
        else {
          if (element.style.visibility)
            element.style.visibility = "visible";
        }
      });
    }
  },

  isDefined: function(object) {
    return typeof(object) != "undefined" && object != null;
  },
  
  // initLightbox()
  // Function runs on window load, going through link tags looking for rel="lightbox".
  // These links receive onclick events that enable the lightbox display for their targets.
  // The function also inserts html markup at the top of the page which will be used as a
  // container for the overlay pattern and the inline image.
  initLightbox: function(id, className, doneHandler, parent) {
    // Already done, just update zIndex
    if ($('#' + id).length) {
       $('#' + id).css({zIndex: Windows.maxZIndex + 1});
      Windows.maxZIndex++;
      doneHandler();
    }
    // create overlay div and hardcode some functional styles (aesthetic styles are in CSS file)
    else {
      var objOverlay = document.createElement("div");
      objOverlay.setAttribute('id', id);
      objOverlay.className = "overlay_" + className;
      objOverlay.style.display = 'none';
      objOverlay.style.position = 'absolute';
      objOverlay.style.top = '0';
      objOverlay.style.left = '0';
      objOverlay.style.zIndex = Windows.maxZIndex + 1;
      Windows.maxZIndex++;
      objOverlay.style.width = '100%';
      objBody.insertBefore(objOverlay, objBody.firstChild);
      if (window.khtml && id == "overlay_modal") {
        setTimeout(function() {doneHandler();}, 10);
      }
      else
        doneHandler();
    }    
  },
  
  setCookie: function(value, parameters) {
    document.cookie= parameters[0] + "=" + escape(value) +
      ((parameters[1]) ? "; expires=" + parameters[1].toGMTString() : "") +
      ((parameters[2]) ? "; path=" + parameters[2] : "") +
      ((parameters[3]) ? "; domain=" + parameters[3] : "") +
      ((parameters[4]) ? "; secure" : "");
  },

  getCookie: function(name) {
    var dc = document.cookie;
    var prefix = name + "=";
    var begin = dc.indexOf("; " + prefix);
    if (begin == -1) {
      begin = dc.indexOf(prefix);
      if (begin != 0) return null;
    } else {
      begin += 2;
    }
    var end = document.cookie.indexOf(";", begin);
    if (end == -1) {
      end = dc.length;
    }
    return unescape(dc.substring(begin + prefix.length, end));
  },
    
  _computeSize: function(content, id, width, height, margin, className) {
    var objBody = document.body;
    var tmpObj = document.createElement("div");
    tmpObj.setAttribute('id', id);
    tmpObj.className = className + "_content";

    if (height)
      tmpObj.style.height = height + "px";
    else
      tmpObj.style.width = width + "px";
  
    tmpObj.style.position = 'absolute';
    tmpObj.style.top = '0';
    tmpObj.style.left = '0';
    tmpObj.style.display = 'none';

    tmpObj.innerHTML = content.stripScripts();
    objBody.insertBefore(tmpObj, objBody.firstChild);

    var size;
    if (height)
      size = $(tmpObj).width() + margin;
    else
      size = $(tmpObj).height() + margin;
    objBody.removeChild(tmpObj);
    return size;
  }  
};

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * Init-by-function modification
 * By Daniel Howard http://www.svexpertise.com/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;
    if ( typeof prop == 'function' ) {
      prop.prototype.init = prop;
      for (var name in prop)
        prop.prototype[name] = prop[name];
      prop = prop.prototype;
    }
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;
 
    // And make this class extendable
    Class.extend = arguments.callee;
   
    return Class;
  };
})();

Window = Class.extend(Window);
