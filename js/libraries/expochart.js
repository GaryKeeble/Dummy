/** 
	Expo Chart Drawing function
	
**/

"use strict";

function ChartTest() {
	
	var canvas = $("#graphCanvas").get(0);
	var rcData = 1767;
	var rcExpo = 10;
	var rcRate = 100;
	var deadband = 0;
	var midrc = 1500;
	var axisRate = 70;
	var superExpoActive = true;
	
	
	$(document).ready(function() {
		var expoChart = new ExpoChart(canvas, rcData, rcExpo, rcRate, deadband, midrc, axisRate, superExpoActive);
		
	});
	
};

$(document).off('.data-api');
window.chartTest = new ChartTest();


/* Wrap whole function in an independant class */

function ExpoChart(canvas, rcData, rcExpo, rcRate, deadband, midrc, axisRate, superExpoActive) {
	
	var fontHeight, fontFace;
	var rcCommandMaxDegS, rcCommandMinDegS;
	var canvasHeightScale;

	// Test directly to master branch
	var DEFAULT_FONT_FACE = "pt Verdana, Arial, sans-serif";
	var stickColor 		  = "rgba(255,102,102,1.0)";  	// Betaflight Orange
	var expoCurveColor    = "rgba(0,0,255,0.5)";		// Blue
	var axisColor		  = "rgba(0,0,255,0.5)";		// Blue
	var axisLabelColor	  = "rgba(0,0,0,0.9)";			// Black

	function constrain(value, min, max) {
	    return Math.max(min, Math.min(value, max));
	}
	
	function rcLookup(tmp, expo, rate) {
	    var tmpf = tmp / 100.0;
	    return ((2500.0 + expo * (tmpf * tmpf - 25.0)) * tmpf * (rate) / 2500.0 );
	}
	
	var rcCommand = function(rcData, rate, expo) {
	        var tmp = Math.min(Math.abs(rcData - midrc), 500);
            (tmp > deadband) ? (tmp -= deadband):(tmp = 0);            
	        return (((rcData < midrc)?-1:1) * rcLookup(tmp, expo, rate)).toFixed(0);
	};
	
	var rcCommandMax = function () {
		return rcCommand(2000, rcRate, rcExpo);
	};

	var rcCommandMin = function () {
		return rcCommand(1000, rcRate, rcExpo);
	};

	var rcCommandRawToDegreesPerSecond = function(value, axisRate, superExpoActive) {

    var calculateRate = function(value) {
		var angleRate;

		if (superExpoActive) {
			var rcFactor = (Math.abs(value) / (500.0 * (rcRate) / 100.0));
			rcFactor = 1.0 / (constrain(1.0 - (rcFactor * (axisRate / 100.0)), 0.01, 1.00));

			angleRate = rcFactor * ((27 * value) / 16.0);
		} else {
			angleRate = ((axisRate + 27) * value) / 16.0;
		}

		return constrain(angleRate, -8190.0, 8190.0); // Rate limit protection
	};

	return calculateRate(value) >> 2; // the shift by 2 is to counterbalance the divide by 4 that occurs on the gyro to calculate the error       

	};

	function calculateDrawingParameters() {

		fontHeight = constrain(canvas.height / 7.5, 20, 50);
		fontFace   = fontHeight + DEFAULT_FONT_FACE;

		rcCommandMaxDegS = rcCommandRawToDegreesPerSecond(rcCommandMax(), axisRate, superExpoActive) + " deg/s";
		rcCommandMinDegS = rcCommandRawToDegreesPerSecond(rcCommandMin(), axisRate, superExpoActive) + " deg/s";
		
		canvasHeightScale = canvas.height / Math.abs(rcCommandRawToDegreesPerSecond(rcCommandMax(), axisRate, superExpoActive) - rcCommandRawToDegreesPerSecond(rcCommandMin(), axisRate, superExpoActive));
		
	};

	 var ctx = canvas.getContext("2d");
	 ctx.translate(0.5, 0.5);

    //Draw an origin line for a graph (at the origin and spanning the window)
    function drawAxisLines() {
        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 1;

        // Horizontal
		ctx.beginPath();
        ctx.moveTo(-canvas.width/2, 0);
        ctx.lineTo( canvas.width/2, 0);        
        ctx.stroke();
        
        // Vertical
		ctx.beginPath();
        ctx.moveTo(0, -canvas.height/2);
        ctx.lineTo(0, canvas.height/2);        
        ctx.stroke();

    }
	 
	 function plotExpoCurve() {

		 ctx.save();
         ctx.strokeStyle = expoCurveColor;
         ctx.lineWidth = 3;

         ctx.beginPath();
         ctx.moveTo(-500, -canvasHeightScale * rcCommandRawToDegreesPerSecond(rcCommand(1000, rcRate, rcExpo), axisRate, superExpoActive));
         for(var rcData = 1001; rcData<2000; rcData++) {
        	ctx.lineTo(rcData-midrc, -canvasHeightScale * rcCommandRawToDegreesPerSecond(rcCommand(rcData, rcRate, rcExpo), axisRate, superExpoActive));
	 	 }
         ctx.stroke();
         ctx.restore();
	 }

	function plotStickPosition(rcData) {
		 ctx.save();

         ctx.beginPath();
         ctx.fillStyle = stickColor;
         ctx.arc(rcData-midrc, -canvasHeightScale * rcCommandRawToDegreesPerSecond(rcCommand(rcData, rcRate, rcExpo), axisRate, superExpoActive), canvas.height / 40, 0, 2 * Math.PI);
         ctx.fill();

         
         ctx.restore();
		
	}

    function drawAxisLabel(axisLabel, x, y, align) {
        ctx.font = fontFace;
        ctx.fillStyle = axisLabelColor;
        if(align!=null) {
            ctx.textAlign = align;
        } else {
            ctx.textAlign = 'center';
        }
        
        ctx.fillText(axisLabel, x, y);
    }

    function drawAxisLabels(rcData) {
    	
    	drawAxisLabel(rcCommandMaxDegS, 0, 0 + fontHeight * 1.5, 'left');
    	drawAxisLabel(rcCommandRawToDegreesPerSecond(rcCommand(rcData, rcRate, rcExpo), axisRate, superExpoActive) + " deg/s", 0,canvas.height/2 + fontHeight/2, 'left');   	

    	drawAxisLabel('1000', 0, canvas.height, 'left');
    	drawAxisLabel('2000', canvas.width, canvas.height, 'right');
    	drawAxisLabel(midrc, canvas.width/2, canvas.height, 'center');   	

    }
    
	// Public Functions
	this.refresh = function(rcData, rcExpo, rcRate, deadband, midrc, axisRate, superExpoActive){
		calculateDrawingParameters();

		ctx.save();
			ctx.translate(canvas.width/2,canvas.height/2);	 
			drawAxisLines();
			plotExpoCurve();
			plotStickPosition(rcData);
		ctx.restore();
		drawAxisLabels(rcData);		
	}

    // Initialisation Code

	// Set the canvas coordinate system to match the rcData/rcCommand outputs
	canvas.width  = 1000; canvas.height=1000;

	var that = this;
	that.refresh(rcData, rcExpo, rcRate, deadband, midrc, axisRate, superExpoActive);
	

}

