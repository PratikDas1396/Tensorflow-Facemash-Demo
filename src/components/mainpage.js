import React, { Component } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as face from '@tensorflow-models/facemesh'
import { TRIANGULATION } from './triangulation'

export class MainPage extends Component {
    videoRef = React.createRef();
    canvasRef = React.createRef();
    videoCanvasRef = React.createRef();
    videoCtx = null
    canvasCtx = null
    facemash_model = null;

    constructor() {
        super();
        this.state = {
            isVideoLoaded: false,
            isCameraAvail: false
        }
    }

    componentDidMount() {
        if (this.state.isCameraAvail && this.state.isVideoLoaded) {
            this.askPermissionAndLoadVideo()
        }
    }

    loadVideo = (stream) => {
        const video = this.videoRef.current;
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
        video.style.width = "100%"
        video.style.height = "100%"
    }

    askPermission() {
        return navigator.mediaDevices.getUserMedia({ video: true })
    }

    askPermissionAndLoadVideo = () => {
        this.askPermission().then(stream => {
            this.setState({ isCameraAvail: true })
            this.loadVideo(stream)
            this.videoCtx = this.prepareCanvas(this.videoCanvasRef.current)
            this.canvasCtx = this.prepareCanvas(this.canvasRef.current)
            this.modalLoad()
        }).catch(console.error)
    }

    prepareCanvas = (canvasRef) => {
        let ctx = null
        canvasRef.style.border = "1px solid #ccc";
        canvasRef.style.backgroundColor = "#000";
        canvasRef.style.width = this.videoRef.current.style.width;
        canvasRef.style.height = this.videoRef.current.style.height;
        ctx = canvasRef.getContext('2d')
        ctx.translate(canvasRef.width, 0);
        ctx.scale(-1, 1);
        ctx.fillStyle = '#32EEDB';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        return ctx;
    }

    modalLoad = async () => {
        const video = this.videoRef.current;
        const canvas = this.canvasRef.current;
        const webcam = await tf.data.webcam(video);

        console.log('Loading facemash..');
        this.facemash_model = await face.load({
            maxFaces: 1
        });
        console.log('Successfully loaded model');

        while (true) {
            const img = await webcam.capture();
            const predictions = await this.facemash_model.estimateFaces(img);
            debugger;
            this.videoCtx.drawImage(video, 0, 0, video.width, video.height, 0, 0, canvas.width, canvas.height);
            if (!this.state.isVideoLoaded)
                this.setState({ isVideoLoaded: true })
            this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
            if (predictions.length > 0) {
                predictions.forEach(prediction => {
                    this.renderFaceMesh(this.canvasCtx, prediction.scaledMesh)
                    for (let i = 0; i < TRIANGULATION.length / 3; i++) {
                        const points = [
                            TRIANGULATION[i * 3], TRIANGULATION[i * 3 + 1],
                            TRIANGULATION[i * 3 + 2]
                        ].map(index => prediction.scaledMesh[index]);
                        this.renderTrangulation(this.videoCtx, points, true);
                    }
                });
            }
            img.dispose();
            await tf.nextFrame();
        }
    }

    render() {
        var content = null
        if (!this.state.isCameraAvail) {
            content = (
                <div className="row">
                    <div className="col-sm-12 mx-auto my-auto">
                        <button className="btn btn-primary" onClick={this.askPermissionAndLoadVideo} >Start Camera</button>
                    </div>
                </div>
            )
        }
        else {
            content = (
                <div className="row">
                    <div className="col-sm-12" style={{ display: (this.state.isCameraAvail && !this.state.isVideoLoaded) ? 'block' : 'none' }}>
                        <div className="mx-auto">
                            <div className="loader"></div>
                            Loading......
                            </div>
                    </div>
                    <div className="container-fluid" style={{ display: (this.state.isCameraAvail && this.state.isVideoLoaded) ? 'block' : 'none' }} >
                        <div className="row">
                            <div className="col-sm-12 col-md-6">
                                <canvas ref={this.videoCanvasRef} width="640px" height="480px"></canvas>
                            </div>
                            <div className="col-sm-12 col-md-6">
                                <canvas ref={this.canvasRef} width="640px" height="480px"   ></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="container-fluid p-4">
                <h2>TensorFlow Facemash API Demonstration</h2>
                <br />
                <div className="row">
                    <div className="col-sm-6" style={{ 'display': 'none' }}>
                        <video ref={this.videoRef} autoPlay  width="640px" height="480px"  ></video>
                    </div>
                </div>
                {content}
            </div>
        )
    }

    isMobileCheck = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    renderTrangulation = (ctx, points, closePath) => {
        const region = new Path2D();
        region.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            region.lineTo(point[0], point[1]);
        }
        if (closePath) {
            region.closePath();
        }
        ctx.stroke(region);
    }

    renderFaceMesh = (ctx, keypoints) => {
        for (let i = 0; i < keypoints.length; i++) {
            const x = keypoints[i][0];
            const y = keypoints[i][1];
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
            ctx.fill();
        }
    }


}

export default MainPage