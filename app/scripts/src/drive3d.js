// TODO: Sound feedback
// TODO: Intro screen
// TODO: finish file case switches
// TODO: Preview images
// TODO: Admin Panel (fonts, etc.)
// TODO: fix color issue
// TODO: Authentication

// Boilerplate
var camera = new THREE.PerspectiveCamera(90, 1, 0.001, 6000),
    scene = new THREE.Scene(),
    renderer = new THREE.WebGLRenderer({
        alpha: true
    });
var effect, controls;
var element, container;
var clock = new THREE.Clock();
var raycaster = new THREE.Raycaster();
var ray = new THREE.Vector2(0.0, 0.0);


// Programmatic
var manager;
var CLIENT_ID = '8dyy3xs0p8c97t2';
var organizedDB = {};
var rawDB = [];
var intersectWithArr = [];
var response;
// colladaLoader
var colladaLoader = new THREE.ColladaLoader(manager);
// colladaLoader.options.convertUpAxis = true;
var path = '';
var pathCollection = [];
var rayCastSphere;
var isPaused = false;
var folder, files = [];
var folderContainer = [];
var staring = false;
var staredObject;
var fonts = {
        "Data Control": 'fonts/Data Control_Latin.json',
        "Helvetiker": 'fonts/helvetiker_regular.typeface.json'
    }
    //for later admin panel
var chosenFont = fonts["Data Control"];

//allow for cleartimeout of stare function
var stareTimeout;
// current file path
var PATH = [];

//floor = hierarchy level (From the bottom);
var floor = 0;
//how high to go
var multiplier = 230;

var tl = new TimelineLite();



// --------------------------------------------------------------------------------PRELOADERS-----------------------------------------------------

function isAuthenticated() {

    return !!getAccessTokenFromUrl();
}

//get access token
function getAccessTokenFromUrl() {
    return utils.parseQueryString(window.location.hash).access_token;
}

// Get Dropbox File Structure
if (!(isAuthenticated())) {
    console.log(!!isAuthenticated());
    console.log("auth needed!");
    var dbx = new Dropbox({
        clientId: CLIENT_ID
    });
    var authUrl = dbx.getAuthenticationUrl('http://localhost:3000/');
    document.getElementById('authlink').href = authUrl;

} else {
    console.log("Authenticated!");
    $("#authlink").remove();
    manager = new THREE.LoadingManager();
    manager.onProgress = function(item, loaded, total) {
        var percent = loaded / total;
        console.log(Math.round(percent * 100) + "%");

        circle.animate(percent)
            // document.getElementById("status").innerHTML = percent + "%";
    }



    manager.onLoad = function() {
        // console.log("ready to go!");
        $('#progress').remove();
        init();
        animate();
    }
}
var dbx = new Dropbox({
    // accessToken: 'teyD2v5ZoUAAAAAAAAAAHVD4sI59CTrcznwVz_9YeiQzH_mN1Xr0S5szatZqTyaB'
    accessToken: getAccessTokenFromUrl()
});

dbx.filesListFolder({
        path: '',
        recursive: true
    })
    .then(function(response) {
        populateRawDB(response);

        function populateRawDB(response) {
            for (entry in response.entries) {
                rawDB.push(response.entries[entry]);
            }

            if (response.has_more && rawDB.length < 10000) {
                // console.log(response);
                console.log("has more!");
                dbx.filesListFolderContinue({
                    cursor: response.cursor
                }).then(function(response) {
                  populateRawDB(response);
                  console.log("added to RawDB!");
                  console.log("RawDB entries num: " + rawDB.length);
                  console.log("last entry: ");
                  console.log(rawDB[rawDB.length-1]);
                });
            } else {
              turnToDb(rawDB);
            }
        }


        function turnToDb(files) {
          console.log("Building to DB....");
            for (entry in files) {
              console.log("files left: " + (files.length - entry))

                var file = files[entry];
                // console.log(file);

                var num = 1;
                var newPath = organizedDB;

                var pathArrRaw = file.path_display.split('/');
                var pathArr = pathArrRaw.slice(0, pathArrRaw.length);
                recurThis(pathArr, newPath);

                function recurThis(pathArr, oDB) {
                    if (!(pathArr[num] in oDB)) {
                        oDB[pathArr[num]] = file;
                        console.log("file created!");

                    } else {
                        newPath = oDB[oDB[pathArr[num]].name];
                        num++;
                        console.log("file exists, going deeper");
                        recurThis(pathArr, newPath);
                    }
                }

                // console.log ("processed file number " + entry + " out of " + files.length);
            }
            // console.log(organizedDB);

        }

    })
    .then(function() {
        createFiles([]);
    })
    .catch(function(error) {
        console.log("restarting, error: ");
        console.log(error);

        var restart = new Promise(function() {
            // if error, delete all and init all
            // PATH = '';
            floor = 0;
            // var count = 0;
            // console.log(folderContainer[folder]);
            for (item in files) {
                scene.remove(item);
            }
            files = [];
        });
        // restart.then(getFiles(PATH));

    });

var circle = new ProgressBar.Circle('#progress', {
    color: '#8A2BE2',
    trailColor: '#eee',
    strokeWidth: 3,
    duration: 250,
    easing: 'easeInOut'
});




// Skybox
var imagePrefix = "images/skybox/new2/";
var directions = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
var imageSuffix = ".png";
var skyGeometry = new THREE.BoxGeometry(5000, 5000, 5000);

var materialArray = [];
for (var i = 0; i < 6; i++)
    materialArray.push(new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader(manager).load(imagePrefix + directions[i] + imageSuffix),
        side: THREE.BackSide
    }));
var skyMaterial = new THREE.MeshFaceMaterial(materialArray);
var skyBox = new THREE.Mesh(skyGeometry, skyMaterial);

// filetype images
var fileIcons = {
    image: new THREE.TextureLoader(manager).load(
        'images/filetypes/image.png'
    ),
    document: new THREE.TextureLoader(manager).load(
        'images/filetypes/document.png'
    ),
    html: new THREE.TextureLoader(manager).load(
        'images/filetypes/html.png'
    ),
    pdf: new THREE.TextureLoader(manager).load(
        'images/filetypes/pdf.png'
    ),
    music: new THREE.TextureLoader(manager).load(
        'images/filetypes/music.png'
    ),
    other: new THREE.TextureLoader(manager).load(
        'images/filetypes/file.png'
    ),
    zip: new THREE.TextureLoader(manager).load(
        'images/filetypes/zip.png'
    ),
    fileImage: function(filePath) {
        new THREE.TextureLoader(manager).load(filePath);
    }
}

//plane TextureLoader
var planeTexture = new THREE.TextureLoader().load(
    'images/textures/patterns/checker.png'
);
planeTexture.wrapS = THREE.RepeatWrapping;
planeTexture.wrapT = THREE.RepeatWrapping;
planeTexture.repeat = new THREE.Vector2(50, 50);
planeTexture.anisotropy = renderer.getMaxAnisotropy();


// --------------------------------------------------------------------------------INIT---------------------------------------------------------------------


function init() {

    element = renderer.domElement;
    container = document.getElementById('example');
    container.appendChild(element);
    var DPR = (window.devicePixelRatio) ? window.devicePixelRatio : 1;
    // var WW = window.innerWidth;
    // var HH = window.innerHeight;
    // renderer.setSize( WW, HH );
    // renderer.setViewport( 0, 0, WW*DPR, HH*DPR );
    renderer.setPixelRatio(DPR);


    effect = new THREE.StereoEffect(renderer);



    camera.position.set(0, 20, 0);
    scene.add(camera);

    controls = new THREE.FirstPersonControls(camera);
    controls.movementSpeed = 0;
    controls.lookSpeed = 0.25;
    controls.noFly = true;
    controls.lookVertical = true;

    function setOrientationControls(e) {
        if (!e.alpha) {
            return;
        }

        controls = new THREE.DeviceOrientationControls(camera, true);
        controls.connect();
        controls.update();

        element.addEventListener('click', fullscreen, false);

        window.removeEventListener('deviceorientation', setOrientationControls, true);
    }
    window.addEventListener('deviceorientation', setOrientationControls, true);
    window.addEventListener('keypress', function(key) {
        // console.log(key);
        if (key.keyCode == 112) {
            isPaused = !isPaused;
        }
    }, true);


    // lights
    var light = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    light.position.set(0, 10, 0);
    scene.add(light);
    var amlight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(amlight);

    //plane
    var material = new THREE.MeshPhongMaterial({
        color: 0x222222,
        specular: 0xffffff,
        shininess: 20,
        shading: THREE.FlatShading,
        map: planeTexture
    });
    var geometry = new THREE.PlaneGeometry(500, 500);
    var plane = new THREE.Mesh(geometry, material);
    plane.name = "plane";

    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -3;
    intersectWithArr.push(plane);

    scene.add(plane);

    scene.add(skyBox);


    window.addEventListener('resize', resize, false);
    setTimeout(resize, 1);


    // corner pillars
    var pillarBallGeo = new THREE.SphereGeometry(10, 12, 30);
    // var pillarBallMat = new THREE.MeshPhongMaterial();
    var pillarBallMat = new THREE.MeshPhongMaterial({
        color: 0x333333,
        specular: 0x333333,
        transparent: true
            // shading: THREE.FlatShading
    });

    var ballCount = 200;
    var iArr = [];
    var pillarBallArr = [];
    var r = 100;
    var s = radians(20);
    var t = radians(40);
    var inc = radians(360 / 20);

    for (var i = 0; i < ballCount; i++) {
        var xCord = r * Math.cos(s) * Math.sin(t);
        var yCord = r * Math.sin(s) * Math.sin(t) + (floor * multiplier);
        var zCord = r * Math.cos(t);

        var pillarBallGeo = new THREE.SphereGeometry(3, 12, 30);
        var pillarBall = new THREE.Mesh(pillarBallGeo, pillarBallMat);
        pillarBall.position.set(xCord, yCord + i * 4, zCord);
        iArr[i] = i;

        pillarBall.material.opacity = 0.5;
        scene.add(pillarBall);
        pillarBallArr.push(pillarBall);
        t -= inc;
    }



    //helper raycast ball
    var sphereGeo = new THREE.SphereGeometry(1, 12, 30);
    sphereGeo.dynamic = true;
    var sphereMat = new THREE.MeshNormalMaterial();
    rayCastSphere = new THREE.Mesh(sphereGeo, sphereMat);
    rayCastSphere.position.set(0, 0, -40);
    rayCastSphere.name = "rayCastSphere";
    camera.add(rayCastSphere);


} //end init


// staring = false;


function createFiles(objName) {

    if (!(objName.length > 0)) {
        path = organizedDB;
        pathCollection = [];
    } else {
        // commonPath.push(objName);
        path = path[objName];
        pathCollection.push(path);
        // console.log("updated pathCol: ");
        // console.log(pathCollection);
        // console.log("last item in commonPath:");
        // console.log(commonPath[commonPath.length-1]);
        // console.log("commonPath: ")
        // console.log(commonPath);
    }



    var reslen = 0;
    for (entry in path) {
        if (path[entry] != null && typeof path[entry] === 'object') {
            reslen++
        }
    }

    //circle vars
    var r = 80;
    var s = radians(0);
    var t = radians(50);
    var inc = radians(360 / reslen);

    for (entry in path) {
        if (path[entry] != null && typeof path[entry] === 'object') {
            // console.log(path[entry]);

            var xCord = r * Math.cos(s) * Math.sin(t);
            var yCord = r * Math.sin(s) * Math.sin(t) + (floor * multiplier);
            var zCord = r * Math.cos(t);
            // console.log(xCord, yCord, zCord, r, s, t);
            makeModel(xCord, yCord, zCord, path[entry]);
            createText(xCord, yCord, zCord, path[entry]);
            // console.log("created entry is:");
            // console.log(path[entry]);
            // } else {
            //     console.log("NOT counting" + path[entry] + "!");
        }
        t -= inc;

        // s+= 20;
    }
    // console.log("final number of objects created: " + reslen);

    function makeModel(xCord, yCord, zCord, entry) {
        // console.log(entry);
        switch (entry[".tag"]) {
            case "folder":
                colladaLoader.load('models/folder2.dae', function(colladaObj) {
                    var folderRaw = colladaObj.scene.children[0].children[0];
                    var folder = new THREE.Object3D();
                    folder.add(new THREE.Mesh(folderRaw.geometry, folderRaw.material));
                    folder.scale.set(10, 10, 10);
                    folder.name = entry.name;
                    folder.type = "folder";
                    folder.tier = floor;

                    // folder.path = path.entries[entry].path_lower;
                    folder.position.set(xCord, yCord, zCord);

                    folder.lookAt(new THREE.Vector3(0, yCord, 0));

                    scene.add(folder);
                    files.push(folder);
                    intersectWithArr.push(folder);
                });
                break;

            case "file":
                // console.log(entry);
                var fullName = entry.path_lower.split('.');
                var filetype = fullName[fullName.length - 1].toLowerCase();

                function chooseTexture(filetype) {
                    switch (filetype) {
                        case "zip":
                            return fileIcons.zip;

                        case "url":
                        case "html":
                            return fileIcons.html;


                        case "txt":
                        case "doc":
                        case "docx":
                            return fileIcons.document;
                        case "pdf":
                            return fileIcons.pdf;

                        case "mp3":
                        case "wav":
                        case "ogg":
                        case "mp2":
                        case "3gp":
                        case "aif":
                        case "aiff":
                        case "m4a":
                        case "m4b":
                            return fileIcons.music;

                        case "jpeg":
                        case "gif":
                        case "jpg":
                        case "bmp":
                        case "png":
                        case "tiff":
                            console.log(entry);
                            return fileIcons.image;
                            // return fileIcons.fileImage(filePath);


                        default:
                            return fileIcons.other;
                            break;
                    }
                }

                var fileMaterial = new THREE.MeshPhongMaterial({
                    // color: 0x222222,
                    // specular: 0xffffff,
                    // shininess: 20,
                    shading: THREE.FlatShading,
                    map: chooseTexture(filetype),
                    transparent: true,
                    side: THREE.DoubleSide
                });
                var fileGeometry = new THREE.PlaneGeometry(25, 25);
                var file = new THREE.Mesh(fileGeometry, fileMaterial);
                file.position.set(xCord, yCord, zCord);
                file.name = entry.name;
                file.tier = floor;
                file.type = filetype;
                file.lookAt(new THREE.Vector3(0, yCord, 0));

                scene.add(file);
                files.push(file);
                intersectWithArr.push(file);

                break;


            default:
                break;


        }
        //end makeModel
    }
    // create folder descriptions
    function createText(xCord, yCord, zCord, entry) {
        // console.log(xCord, yCord, zCord);
        // console.log(entry);
        var loader = new THREE.FontLoader();
        var fontSize;
        if (entry.name.length < 12) {
            fontSize = 4;
        } else if (entry.name.length < 16) {
            fontSize = 3;
        } else {
            fontSize = 2;
        }

        loader.load(chosenFont, function(font) {
            var textGeo = new THREE.TextGeometry(entry.name, {
                font: font,
                size: fontSize,
                height: 0.4,
                curveSegments: 6,
                bevelThickness: 1,
                bevelSize: 0.1,
                bevelEnabled: false
            });

            textGeo.computeBoundingBox();
            var text = new THREE.Mesh(textGeo, new THREE.MeshPhongMaterial({
                color: 0x000000
            }));
            var xMiddle = text.geometry.boundingBox.max.x / 2;
            textGeo.applyMatrix(new THREE.Matrix4().makeTranslation(xMiddle * -1, 0, 0));
            text.position.set(xCord, yCord + 25, zCord);
            text.tier = floor;
            text.type = "text";
            files.push(text);
            text.lookAt(new THREE.Vector3(0, yCord, 0));
            scene.add(text);
            // folderContainer[folderContainer.length - 1].push(mesh);
        });
    } // End TextGeometry
}

// } // end getFiles



function rayCast() {
    // Raycasting
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(ray, camera);
    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects(intersectWithArr, true);
    // console.log(intersects.length);

    if (intersects.length == 0) {
        staring = false;
        clearTimeout(stareTimeout);

        rayCastSphere.scale.set(1, 1, 1);

        // console.log("staring at something? " + staring);

    } else if (intersects.length != 0 && intersects[0].object.name != "plane") {
        // console.log(intersects[0].object);
        if (!staring) {
            if (intersects[0].object.parent != null) {
                var object = intersects[0].object.parent;
            } else {
                var object = intersects[0].object;
            }
            open(object);
            // console.log("staring at something? " + staring);
        }

    } else if (intersects.length != 0 && intersects[0].object.name == "plane" && floor > 0) {
        // staring = true;
        // console.log("staring at something? " + staring);
        if (!staring) {
            rayCastSphere.scale.set(1, 1, 1);
            open();
        }
    }

}

function open(object) {
    if (object != undefined) {
        staring = true;
        // console.log("staring at ");
        // console.log(object.name);
        staredObject = object;


        stareTimeout = setTimeout(function() {
            // console.log("going up!");
            var objName = object.name.toString();

            floor += 1;

            // console.log("up! Path is: ")
            // console.log(objName);
            createFiles(objName);
            travel();
        }, 1000);
    } else {

        staring = true;
        // console.log("staring at floor");


        stareTimeout = setTimeout(function() {
            // remove file tier
            // console.log(files);
            for (item in files) {
                if (files[item].tier == floor) {
                    scene.remove(files[item]);
                }
            }

            floor -= 1;

            // console.log("Current Path collection: ");
            // console.log(pathCollection);
            //
            // console.log("reducing");
            pathCollection.pop();
            // console.log("post reduction");
            // console.log(pathCollection);
            if (pathCollection.length > 0) {
                path = pathCollection[pathCollection.length - 1];
            } else {
                path = organizedDB;
            }
            // console.log("path is");
            // console.log(path);
            travel();
            staring = false;
        }, 1000);

    }
}

function travel() {
    tl.to(camera.position, 1, {
        y: floor * multiplier,
        ease: Quad.easeOut
    });
}

// ----------------------------------------------------------------------------RENDER/ANIMATE------------------------------------------------------

function render(dt) {
    rayCast();


    effect.render(scene, camera);

    // renderer.render(scene, camera);
}

function animate(t) {

    if (staring) {
        staredObject.rotation.y += 0.01;
        rayCastSphere.scale.x += 0.03;
        rayCastSphere.scale.y += 0.03;
        rayCastSphere.scale.z += 0.03;
    }



    requestAnimationFrame(animate);

    update(clock.getDelta());
    render(clock.getDelta());
}


// --------------------------------------------------------------------------------HELPERS------------------------------------------------------------


//convert degrees to radians
function radians(degree) {
    return degree * Math.PI / 180;
}





function resize() {
    var width = container.offsetWidth;
    var height = container.offsetHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // renderer.setSize(width, height);
    effect.setSize(width, height);
}

function update(dt) {
    resize();
    camera.updateProjectionMatrix();
    if (!isPaused) {
        controls.update(dt);
    }
}

function fullscreen() {
    if (container.requestFullscreen) {
        container.requestFullscreen();
    } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
    } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
    } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
    }
}
