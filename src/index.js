import React from 'react';
import { render } from 'react-dom';
import { Stage, Layer, Line, Shape, Text } from 'react-konva';

//default code template from Konvajs: https://konvajs.org/docs/react/Free_Drawing.html
const App = () => {
	const [polygon, setPolygon] = React.useState(null);
	const [shapeLines, setShapeLines] = React.useState([]);
	const edges = React.useRef([]);
	const dpTable = React.useRef(null);
	const isClockwise = React.useRef(false);

	const isDrawing = React.useRef(false);
	const dataRef = React.useRef(null);
	const selection = React.useRef({
		visible: false,
		x1: 0,
		y1: 0,
		x2: 0,
		y2: 0
	});

	document.addEventListener("contextmenu", (event) => {
		event.preventDefault();
	});

	React.useEffect(() => {
		dataRef.current.value = polygon ? JSON.stringify(polygon) : "";
		edges.current = [];
		if (polygon) {
			let shapeLen = polygon.length;
			polygon.forEach((line, index) => {
				edges.current.push([line, polygon[(index + 1) % shapeLen]]);
			});

			isClockwise.current = !orientation();
			console.log(isClockwise.current);
		}
		const escCallback = event => {
			if (event.keyCode == 27) {
				event.stopPropagation();
				event.preventDefault();
				console.log(polygon);
				console.log(shapeLines);
				let lastVertex = null;
				if (polygon && polygon.length > 1) {
					setShapeLines(polygon);
					lastVertex = polygon[polygon.length - 1];
					shapeLines.splice(shapeLines.length - 1, 1);
					setPolygon(null);
				} else if (shapeLines.length > 0) {
					lastVertex = shapeLines[shapeLines.length - 2];
					shapeLines.splice(shapeLines.length - 2, 2);
					if (shapeLines.length < 1) {
						isDrawing.current = false;
						setShapeLines([]);
						return;
					}
				}
				if (lastVertex) {
					let pos = lastVertex;
					selection.current.x1 = pos.x;
					selection.current.y1 = pos.y;
					selection.current.x2 = pos.x;
					selection.current.y2 = pos.y;
					updateSelectionLine();
					isDrawing.current = true;
				}
			}
		};
		document.addEventListener("keydown", escCallback);
		return () => {
			document.removeEventListener("keydown", escCallback);
		};
	}, [JSON.stringify(polygon), JSON.stringify(shapeLines)]);

	const handleMouseDown = (e) => {
		if (e.evt.ctrlKey) {
			setPolygon(null);
			isDrawing.current = true;
			const stage = e.target.getStage()
			if (stage) {
				const pos = stage.getPointerPosition();

				selection.current.visible = true;
				selection.current.x1 = pos.x;
				selection.current.y1 = pos.y;
				selection.current.x2 = pos.x;
				selection.current.y2 = pos.y;
				updateSelectionLine();
			}
		}
	};

	const handleMouseMove = (e) => {
		// no drawing - skipping
		if (!isDrawing.current) {
			return;
		}
		const stage = e.target.getStage();
		const pos = stage.getPointerPosition();

		selection.current.x2 = pos.x;
		selection.current.y2 = pos.y;
		updateSelectionLine(false);
	};

	const updateSelectionLine = (save = true) => {
		let lineAttr = {
			x: parseInt(selection.current.x1),
			y: parseInt(selection.current.y1),
			stroke: "gold",
			strokeWidth: 5,
			points: [0, 0,
				(parseInt(selection.current.x2) - parseInt(selection.current.x1)),
				(parseInt(selection.current.y2) - parseInt(selection.current.y1))],
			index: shapeLines.length - 1
		};

		if (save) {
			if (shapeLines.length > 0) {
				let firstLine = shapeLines[0];
				let clientA = {
					x: firstLine.x,
					y: firstLine.y,
					width: firstLine.strokeWidth,
					height: firstLine.strokeWidth
				}
				let clientB = {
					x: lineAttr.x + lineAttr.points[2],
					y: lineAttr.y + lineAttr.points[3],
					width: firstLine.strokeWidth,
					height: firstLine.strokeWidth
				}

				if (Konva.Util.haveIntersection(clientA, clientB)) {
					let lastLine = shapeLines[shapeLines.length - 1];
					lastLine.points[2] = firstLine.x - lastLine.x;
					lastLine.points[3] = firstLine.y - lastLine.y;

					setPolygon(shapeLines);
					setShapeLines([]);
					isDrawing.current = false;
					return;
				}

				setShapeLines([...shapeLines, lineAttr]);
			}
		} else {
			setShapeLines([...shapeLines.slice(0, -1), lineAttr]);
		}
	};

	const handleMouseUp = () => {
		//isDrawing.current = false;
	};

	/***code inside enclosed comments below is ported from 
		ORourke's java code on his website: https://www.science.smith.edu/~jorourke/books/ftp.html, 
		with some slight modifications.***/
	//=========================================================================================
	const AreaSign = (a, b, c) => {
		/*let area2 = (b.x - a.x) * (c.y - a.y) -
			(c.x - a.x) * (b.y - a.y);*/
		let area2 = (b.x - a.x) * (a.y - c.y) -
			(c.x - a.x) * (a.y - b.y);

		return area2;
	}

	/*---------------------------------------------------------------------
	 *Returns true iff c is strictly to the left of the directed
	 *line through a to b.
	 */
	const Left = (a, b, c) => {
		return AreaSign(a, b, c) > 0;
	}
	var a = { x: 10, y: 10 };
	var b = { x: 20, y: 10 };
	var c = { x: 100, y: 5 };
	console.assert(Left(a, b, c));

	const LeftOn = (a, b, c) => {
		return AreaSign(a, b, c) >= 0;
	}
	var a = { x: 10, y: 10 };
	var b = { x: 20, y: 10 };
	var c = { x: 100, y: 10 };
	console.assert(LeftOn(a, b, c));

	const Collinear = (a, b, c) => {
		return AreaSign(a, b, c) === 0;
	}
	var a = { x: 10, y: 10 };
	var b = { x: 20, y: 20 };
	var c = { x: 15, y: 15 };
	console.assert(Collinear(a, b, c));

	/*---------------------------------------------------------------------
	   *Returns true iff point c lies on the closed segement ab.
	   *First checks that c is collinear with a and b.
	   */
	const Between = (a, b, c) => {
		if (!Collinear(a, b, c))
			return false;

		/* If ab not vertical, check betweenness on x; else on y. */
		if (a.x != b.x)
			return ((a.x <= c.x) && (c.x <= b.x)) ||
				((a.x >= c.x) && (c.x >= b.x));
		else
			return ((a.y <= c.y) && (c.y <= b.y)) ||
				((a.y >= c.y) && (c.y >= b.y));
	}

	/*---------------------------------------------------------------------
	  *Returns TRUE iff segments ab & cd intersect, properly or improperly.
	  */
	const Intersect = (a, b, c, d) => {
		if (IntersectProp(a, b, c, d))
			return true;

		else if (Between(a, b, c)
			|| Between(a, b, d)
			|| Between(c, d, a)
			|| Between(c, d, b))
			return true;

		else
			return false;
	}

	const IntersectProp = (a, b, c, d) => {
		/* Eliminate improper cases. */
		if (
			Collinear(a, b, c) ||
			Collinear(a, b, d) ||
			Collinear(c, d, a) ||
			Collinear(c, d, b))
			return false;

		return Xor(Left(a, b, c), Left(a, b, d))
			&& Xor(Left(c, d, a), Left(c, d, b));
	}

	/*---------------------------------------------------------------------
	  *Exclusive or: true iff exactly one argument is true.
	  */
	const Xor = (x, y) => {
		/* The arguments are negated to ensure that they are 0/1 values. */
		/* (Idea due to Michael Baldwin.) */
		return !x ^ !y;
	}

	/*---------------------------------------------------------------------
		*Returns true iff (a,b) is a proper internal *or* external	
		*diagonal of P, *ignoring edges incident to a and b*.
		*/
	const Diagonalie = (a, b) => {
		let c, c1;
		let lines = polygon;
		/* For each edge (c,c1) of P */
		c = lines[0]
		do {
			c1 = lines[(c.index + 1) % lines.length];
			/* Skip edges incident to a or b */
			if ((JSON.stringify(c) != JSON.stringify(a)) && (JSON.stringify(c1) != JSON.stringify(a))
				&& (JSON.stringify(c) != JSON.stringify(b)) && (JSON.stringify(c1) != JSON.stringify(b))
				&& Intersect(a, b, c, c1)
			)
				return false;
			c = lines[(c.index + 1) % lines.length];
		} while (JSON.stringify(c) != JSON.stringify(lines[0]));
		return true;
	}

	/**
	 * Identical to InCone but only works for clockwise oriented polygons
	 * @param {Object} a the first vertex
	 * @param {Object} b the second vertex
	 * @returns true iff the diagonal (a,b) is strictly internal to the 
	 * polygon in the neighborhood of the a endpoint. 
	 */
	const InCone = (a, b) => {
		let lines = polygon;
		let a0, a1;

		if (isClockwise.current) {
			a0 = lines[(a.index + 1) % lines.length];
			a1 = lines[a.index == 0 ? lines.length - 1 : a.index - 1];
		} else {
			a0 = lines[a.index == 0 ? lines.length - 1 : a.index - 1];
			a1 = lines[(a.index + 1) % lines.length];
		}

		if (LeftOn(a, a1, a0))
			return Left(a, b, a0)
				&& Left(b, a, a1);

		return !(LeftOn(a, b, a1)
			&& LeftOn(b, a, a0));
	}


	/**
	 * The Diagonal function but for use in clockwise oriented polygons
	 * @returns Returns TRUE iff (a,b) is a proper internal diagonal.
	 */
	const Diagonal = (a, b) => {
		return InCone(a, b) && InCone(b, a) && Diagonalie(a, b);
	}

	//=========================================================================================
	const countTriangulations = () => {
		if (!edges.current.length) {
			alert("a polygon does not exist");
			return;
		}
		let shapeLen = polygon.length;
		//create a 2d array of zeroes: https://stackoverflow.com/questions/3689903/how-to-create-a-2d-array-of-zeroes-in-javascript
		dpTable.current = Array(shapeLen).fill().map(() => Array(shapeLen).fill(0));

		if (isClockwise.current) {
			alert(recurFind(1, 0));
		} else {
			alert(recurFind(0, 1));
		}
	}
	/**
	 * Determines the orientation of the polygon
	 * @returns true if counterclockwise, false otherwise
	 */
	const orientation = () => {
		let vertices = polygon;
		let minYVal = Number.MAX_SAFE_INTEGER;
		let minIndex = 0;
		vertices.forEach((vertex, index) => {
			if (vertex.x < minYVal) {
				minIndex = index;
				minYVal = vertex.x;
			}
		})
		return (Left(polygon[minIndex], polygon[(minIndex + 1) % polygon.length], polygon[(minIndex - 1 + polygon.length) % polygon.length]));
	}

	const isEdge = (a, b) => {
		return JSON.stringify(edges.current).includes(JSON.stringify([a, b]))
			|| JSON.stringify(edges.current).includes(JSON.stringify([b, a]));
	}

	const importPolygon = () => {
		setPolygon(JSON.parse(dataRef.current.value));
	}

	/**
	 * Adapts the recursive algorithm to work for clockwise polygons
	 * 
	 * @returns the number of triangulations
	 */
	const recurFind = (i, j) => {
		let table = dpTable.current;
		if (table[i][j] > 0) return table[i][j];
		let lines = polygon;
		let start = lines[i];
		let end = lines[j];
		let count = 0;
		lines.forEach((vertex, index) => {
			if (i == index || j == index) return;
			console.log(start.index);
			console.log([start.x, start.y]);
			console.log(end.index);
			console.log([end.x, end.y]);
			console.log(vertex.index);
			console.log([vertex.x, vertex.y]);
			console.log(Left(start, end, vertex));
			console.log(isEdge(start, vertex));
			console.log(Diagonal(start, vertex));
			console.log(isEdge(end, vertex));
			console.log(Diagonal(end, vertex));
			console.log();
			if (Left(start, end, vertex) &&
				(isEdge(start, vertex) || Diagonal(start, vertex)) &&
				(isEdge(end, vertex) || Diagonal(end, vertex))) {
				count += recurFind(i, index) * recurFind(index, j);
			}
		});
		if (!count) count = 1;
		return table[i][j] = count;
	}


	return (
		<div>
			<input ref={dataRef} type="text" size="80"></input>
			<button onClick={importPolygon}>import</button>
			<button onClick={countTriangulations}>calculate</button>
			<Stage
				width={window.innerWidth}
				height={window.innerHeight}
				onMouseDown={handleMouseDown}
				onMousemove={handleMouseMove}
				onMouseup={handleMouseUp}
			>
				<Layer>
					<Text text='1. Hold "Ctrl" button to place vertices' x={5} y={10} />
					<Text text='2. You can press "Esc" to undo the previous edge at any time' x={5} y={30} />
					<Text text='3. After a polygon is formed by enclosing its area, click "calculate" to calculate the number of different triangulations' x={5} y={50} />
					<Text text='4. After a polygon is formed, you can move any vertex by dragging its vertex number' x={5} y={70} />
					<Text text='5. After a polygon is formed, you can double-click on any vertex number to remove the corresponding vertex'
						x={5} y={90} />
					{
						shapeLines.map((line, index) => {
							return <React.Fragment key={index}>
								<Line
									name="line"
									{...line}
									tension={0.5}
									lineCap="round"
								/>
								<Line
									name="dot"
									{...line}
									points={[0, 0, 0, 0]}
									stroke="red"
									lineCap="round"
								/>
								<Text
									name="text"
									x={line.x}
									y={line.y}
									text={index}
									fontSize={20}
								/>
							</React.Fragment>
						})
					}
					{
						polygon ? <Shape
							name="shape"
							shapeLines={polygon}
							stroke="gold"
							strokeWidth={5}
							lineCap="round"
							sceneFunc={(context, shape) => {
								let lines = polygon;
								context.beginPath();
								context.moveTo(lines[0].x, lines[0].y);

								lines.forEach(line => {
									context.lineTo(line.x + line.points[2], line.y + line.points[3]);
								})
								context.lineJoin = "round";

								// (!) Konva specific method, it is very important
								context.fillStrokeShape(shape);
							}}
						/> : null
					}
					{
						polygon ? polygon.map((line, index) => {
							return <React.Fragment>
								<Line
									name="dot"
									{...line}
									points={[0, 0, 0, 0]}
									stroke="red"
									tension={0.5}
									lineCap="round"
								/>
								<Text
									key={index}
									name="text"
									x={line.x}
									y={line.y}
									text={line.index}
									fontSize={20}
									draggable
									onDragMove={e => {
										let shapeLines = JSON.parse(JSON.stringify(polygon));
										line.x = e.target.x();
										line.y = e.target.y();

										let next = shapeLines[(index + 1) % shapeLines.length];
										let prev = shapeLines[index == 0 ? shapeLines.length - 1 : index - 1];

										line.points[2] = next.x - line.x;
										line.points[3] = next.y - line.y;

										prev.points[2] = line.x - prev.x;
										prev.points[3] = line.y - prev.y;

										shapeLines[line.index] = line;

										setPolygon(shapeLines);
									}}
									onDblClick={() => {
										let shapeLines = JSON.parse(JSON.stringify(polygon));
										if (shapeLines.length <= 3) return;

										let next = shapeLines[(line.index + 1) % shapeLines.length];
										let prev = shapeLines[line.index == 0 ? shapeLines.length - 1 : line.index - 1];

										prev.points[2] = next.x - prev.x;
										prev.points[3] = next.y - prev.y;

										shapeLines.splice(line.index, 1);

										for (let cursor = next; cursor.index != 0;
											cursor = shapeLines[(cursor.index + 1) % shapeLines.length]) {
											cursor.index--;
										}

										setPolygon(shapeLines);
									}
									}
								/></React.Fragment>
						}) : null
					}
				</Layer>
			</Stage>
		</div>
	);
};

render(<App />, document.getElementById('root'));
