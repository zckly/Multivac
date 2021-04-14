import { useState } from "react";
import axios from "axios";
import spinnerSrc from "./spinner.svg";
import { v4 as uuid } from "uuid";
import Tree from "react-d3-tree";
import { useCenteredTree } from "./helpers";

const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const URL = "https://api.openai.com/v1/engines/davinci/completions";
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};
console.log(process.env);
const solvePrompt = (question) => {
  const prompt = `The best way to learn a new skill is to break it up into as many steps as possible. Here are a few examples of new skills and the list of steps needed to solve them.\n\nSkill: Front End Web Development\n1. Learn HTML\n2. Learn CSS\n3. Learn JS\n4. Learn Git\n5. Learn Svelte\n6. Learn React\nSkill: Data Science\n1. Learn Python\n2. Learn Pandas and Numpy\n3. Learn Data Exploration\n4. Learn Linear Regression\n5. Learn Logistic Regression\n6. Learn bagging algorithms\n7. Learn boosting algorithms\n8. Learn clustering\n9. Learn convolutional neural networks\n10. Learn recurring neural networks\n11. Learn Reinforcement Learning\n\nProblem: ${question}\n`;
  return {
    prompt,
    temperature: 0.7,
    max_tokens: 300,
    top_p: 1,
    frequency_penalty: 0.5,
    presence_penalty: 0,
    stop: ["Skill:"],
  };
};

async function solveProblem(question, depth) {
  if (depth === 0) return [];
  // returns an object for a question
  const data = solvePrompt(question.trim());
  try {
    const res = await axios.post(URL, data, { headers });
    const out = res.data.choices[0].text;
    let lines = out.split("\n").filter((line) => line.trim() !== "");
    console.log({ lines });
    let statements = lines
      .filter((line) => line.split(".").length > 1)
      .map((line) => line.split(".")[1].trim());

    let nodes = [];
    for (const s of statements) {
      // const question = await toQuestion(s);
      nodes.push({
        name: s,
        question: s,
        id: uuid(),
        children: await solveProblem(question, depth - 1),
      });
    }
    return nodes;
  } catch (error) {
    console.error(error);
  }
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [problem, setProblem] = useState("");
  const [tree, setTree] = useState({});
  const [showSpinner, setShowSpinner] = useState(false);
  const [translate, containerRef] = useCenteredTree();

  async function onSubmit() {
    // ignoring empty textarea
    if (problem.trim() === "") return;

    setTree({});
    setIsLoading(true);
    let children = await solveProblem(problem, 1);
    setTree({
      children: children,
      name: problem.trim(),
    });

    setIsLoading(false);
    console.log(tree);

    return;
  }

  async function onNodeClick(node) {
    console.log(node);
    if (!node) return;
    setShowSpinner(true);

    const newTree = await generateChildrenForId(tree, node.id);
    setTree({
      ...newTree,
    });
    setShowSpinner(false);
  }

  async function generateChildrenForId(subtree, id) {
    if (!subtree.children) return subtree;

    let newChildren = [];

    for (let i = 0; i < subtree.children.length; i++) {
      if (subtree.children[i].id === id) {
        newChildren.push({
          ...subtree.children[i],
          children: await solveProblem(subtree.children[i].question, 1),
        });
      } else {
        newChildren.push(await generateChildrenForId(subtree.children[i], id));
      }
    }

    subtree.children = newChildren;
    return subtree;
  }

  return (
    <>
      <div className=" h-full flex flex-col items-center justify-center">
        <div
          className="w-full h-full flex flex-col font-mono mt-4"
          style={{
            maxWidth: 900,
          }}
        >
          <div className="p-8  flex flex-col justify-center w-full">
            <p className="text-5xl font-mono">Vivid</p>
            <p className="font-medium text-gray-800 text-md font-mono">
              Learn anything
            </p>
          </div>

          <div className="bg-gray-100 rounded p-8" style={{ maxWidth: 1000 }}>
            <p className="font-medium text-lg">
              What skill do you want to learn?
            </p>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-full border shadow font- p-4 rounded-lg my-2"
              placeholder="UX Design"
            />
            {isLoading ? (
              <button className="font-medium text-white bg-blue-700 text-md px-4 py-2 flex items-center justify-center disabled opacity-75">
                <img src={spinnerSrc} className="w-5 h-5 mr-2" alt="" />
                Calculating...
              </button>
            ) : (
              <button
                onClick={onSubmit}
                className="font-medium text-white bg-blue-700 text-md px-4 py-2 flex items-center justify-center"
              >
                Calculate solution
              </button>
            )}
          </div>
        </div>
        {tree !== {} && (
          <>
            <div
              ref={containerRef}
              className="bg-gray-50 w-full h-full items-center  shadow-2xl rounded border-4 mb-8 mt-12"
              style={{
                height: `90vh`,
                width: `90vw`,
              }}
            >
              {showSpinner && (
                <div className="w-full flex  justify-center">
                  <div className="absolute bg-black shadow w-48 flex items-center justify-center rounded px-4 py-2 flex text-white opacity-75 mt-4">
                    <img src={spinnerSrc} className="w-5 h-5 mr-2" alt="" />{" "}
                    Calculating...
                  </div>
                </div>
              )}
              <Tree
                translate={translate}
                depthFactor={500}
                separation={{ siblings: 3, nonSiblings: 3 }}
                data={tree}
                renderCustomNodeElement={({ nodeDatum, toggleNode }) => {
                  if (!nodeDatum.name) return null;
                  return (
                    <g>
                      {/* `foreignObject` requires width & height to be explicitly set. */}
                      <foreignObject
                        onClick={() => onNodeClick(nodeDatum)}
                        width={300}
                        height={600}
                        style={{}}
                      >
                        <div
                          style={{
                            border: "1px solid #000",
                            backgroundColor: "white",
                          }}
                        >
                          <p
                            style={{
                              textAlign: "left",
                              borderRadius: 3,
                              padding: 4,
                              fontSize: 20,
                            }}
                          >
                            {nodeDatum.name}
                          </p>
                        </div>
                      </foreignObject>
                    </g>
                  );
                }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;
