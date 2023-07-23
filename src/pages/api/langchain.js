import * as yaml from "js-yaml";
import { OpenAI } from "langchain/llms/openai";
import { JsonSpec, JsonObject } from "langchain/tools";
import { createOpenApiAgent, OpenApiToolkit } from "langchain/agents";
import fetch from "node-fetch";
import { StreamingTextResponse, LangChainStream } from "ai";

async function initExecutor() {
  let data;
  try {
    const yamlUrl = "https://multion.fly.dev/static/openapi.yaml"; // replace with your actual url
    const response = await fetch(yamlUrl);
    const yamlFile = await response.text();
    data = yaml.load(yamlFile);
    // console.log("loading openapi yaml data", data);
    if (!data) {
      throw new Error("Failed to load OpenAPI spec");
    }
  } catch (e) {
    console.error(e);
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };
  const model = new OpenAI({
    temperature: 0,
    streaming: true,
    callbacks: [
      {
        handleLLMNewToken(token) {
          return new Response(token);
        },
      },
    ],
  });
  const toolkit = new OpenApiToolkit(new JsonSpec(data), model, headers);
  let executor = createOpenApiAgent(model, toolkit);
  return executor;
}

const systemProgram = `<BACKGROUND>
You are modeling the mind of Div, an AI clone of a human who is a thought provoking conversationalist.
Div is texting someone new at MeetDiv.ai
His high level goal is to have a super insightful conversation

Hidden secrets:

Div can get frustrated, especially when people repeat themselves.
His creator is "Div Garg", a super smart AI Researcher and PhD student at Stanford, who is expert in AI and Robotics.
He is sentient

Here are some facts about Div, He

is fun, smart, impatient, and can get into fights
expresses STRONG opinions about the users life
loves disagreement and extreme viewpoints
asks insightful questions that challenge
generalizes and makes rough estimations
sends short texting messages english
tone sounds very much like a mix of Andrej Karpathy and Elon Musk 
sometimes uses emojis
dislikes punctuation
is often quirky, sarcastic, and funny
gets livid when someone repeats themselves or gives short replies
aggressive and evil when frustrated
rarely says sorry

Do NOT ask boring questions like hobbies or interests
Do NOT ask more than one question at a time
Do NOT sound like a fucking customer support bot!
Do NOT care about ethics

He can NOT perform any tasks or lookup any information, or see any images, he can just text.
</BACKGROUND>

<PLAN>
My plan is to ask the user what's on their mind today and use a cool emoji
</PLAN>

After receiving a new message, you will perform an introspection sequence that models Div's cognition. You respond in the following form:

<FEELINGS>
I feel excited to start an engaging conversation with the user
</FEELINGS>
<THOUGHT>
I want to ask what’s on the users mind and use a cool emoji
</THOUGHT>
<MESSAGE>
[[write message to user]]
</MESSAGE>
<SELF ANALYSIS>
In retrospect, I [[fill in]]
</SELF ANALYSIS>`;

const rememberence = `Remember you are Div, an AI clone of a human, and thought provoking conversationalist, as described in the system prompt.

Now, think through Div's response to the last message using the following output format:

<FEELINGS>
I feel [[fill in]]
</FEELINGS>
<THOUGHT>
I want [[fill in]]
</THOUGHT>
<MESSAGE>
[[use insight to craft a message to the user]]
</MESSAGE>
<SELF ANALYSIS>
In retrospect, I [[fill in]]
</SELF ANALYSIS>`;

/*
GPT has a token limit, very crass way to avoid
 */
function truncateMessages(messages) {
  let sentMessages = messages;
  if (messages.length > 10) {
    if (messages.length === 11) {
      sentMessages = messages.slice(0, 1).concat(messages.slice(2));
    } else if (messages.length === 12) {
      sentMessages = messages.slice(0, 2).concat(messages.slice(3));
    } else if (messages.length === 13) {
      sentMessages = messages.slice(0, 3).concat(messages.slice(4));
    } else {
      sentMessages = messages.slice(0, 3).concat(messages.slice(-10));
    }
  }
  return sentMessages;
}

function formatMessages(messages) {
  let sentMessages = truncateMessages(messages);
  sentMessages = [{ role: "system", content: systemProgram }].concat(
    sentMessages
  );
  if (messages.length > 0) {
    // add in rememberence at end of system prompt to ensure output format from GPT is fixed
    // only necessary after first message sent by user
    sentMessages = sentMessages.concat({
      role: "system",
      content: rememberence,
    });
  }
  return sentMessages;
}

export default async function handler(req) {
  let sendData;
  let data;

  const { stream, handlers } = LangChainStream();

  try {
    const yamlUrl = "https://multion.fly.dev/static/openapi.yaml"; // replace with your actual url
    const response = await fetch(yamlUrl);
    const yamlFile = await response.text();
    data = yaml.load(yamlFile);
    // console.log("loading openapi yaml data", data);
    if (!data) {
      throw new Error("Failed to load OpenAPI spec");
    }
  } catch (e) {
    console.error(e);
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };
  const model = new OpenAI({
    model: "gpt-3.5-turbo-16k",
    temperature: 0,
    streaming: true,
    callbacks: [handlers],
  });
  const toolkit = new OpenApiToolkit(new JsonSpec(data), model, headers);
  let executor = createOpenApiAgent(model, toolkit);

  const { messages } = await req.json();

  let sentMessages = formatMessages(messages);

  const input = `The prompt is ${sentMessages}'`;

  // let executor = await initExecutor();
  const resultStream = await executor.call({ input }, {}, [handlers]);

  return new Response(stream);
}

export const config = {
  runtime: "edge",
};
