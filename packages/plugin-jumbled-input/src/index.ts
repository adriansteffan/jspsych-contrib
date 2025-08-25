import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

import { version } from "../package.json";

const info = <const>{
  name: "jumbled-input",
  version: version,
  parameters: {
    /** HTML content to be displayed above the text input field. */
    html: {
      type: ParameterType.HTML_STRING,
      default: "",
    },
    /** Object mapping input characters to display characters. Keys are the characters typed, values are the characters displayed. */
    character_mapping: {
      type: ParameterType.OBJECT,
      default: {},
    },
    /** The label for the continue button. */
    button_label: {
      type: ParameterType.STRING,
      default: "Continue",
    },
    /** Whether to require a response before allowing the participant to continue. */
    require_response: {
      type: ParameterType.BOOL,
      default: true,
    },
    /** Placeholder text for the input field. */
    placeholder: {
      type: ParameterType.STRING,
      default: "",
    },
  },
  data: {
    /** The final text displayed in the input field (after character mapping). */
    response: {
      type: ParameterType.STRING,
    },
    /** The raw text that was actually typed by the participant (before character mapping). */
    raw_input: {
      type: ParameterType.STRING,
    },
    /** The keys that were pressed in order to manipulate the string along with timestamps. */
    log: {
      type: ParameterType.OBJECT,
    },
    /** Response time in milliseconds from trial start to submission. */
    rt: {
      type: ParameterType.INT,
    },
  },
  // prettier-ignore
  citations: '__CITATIONS__',
};

type Info = typeof info;

/**
 * **jumbled-input**
 *
 * Provides a text input field and a mapping of characters that replace the input letters deterministically
 *
 * @author Adrian Steffan
 * @see {@link https://github.com/jspsych/jspsych-contrib/packages/plugin-jumbled-input/README.md}}
 */
class JumbledInputPlugin implements JsPsychPlugin<Info> {
  static info = info;

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    const start_time = performance.now();

    display_element.innerHTML = `
  <div id="jspsych-jumbled-input-wrapper">
    <div id="jspsych-jumbled-input-stimulus">${trial.html}</div>
    <div id="jspsych-jumbled-input-response">
      <textarea id="jspsych-jumbled-input-textbox" autocomplete="off" placeholder="${trial.placeholder.replace(
        /"/g,
        "&quot;"
      )}" rows="3"></textarea>
    </div>
    <div id="jspsych-jumbled-input-nav">
      <button type="button" id="jspsych-jumbled-input-next" class="jspsych-btn" ${
        trial.require_response ? "disabled" : ""
      }>${trial.button_label}</button>
    </div>
  </div>
`;

    const next_button = display_element.querySelector(
      "#jspsych-jumbled-input-next"
    ) as HTMLButtonElement;
    const wrapper = display_element.querySelector("#jspsych-jumbled-input-wrapper") as HTMLElement;
    const stimulus = display_element.querySelector(
      "#jspsych-jumbled-input-stimulus"
    ) as HTMLElement;
    const response = display_element.querySelector(
      "#jspsych-jumbled-input-response"
    ) as HTMLElement;
    const textbox = display_element.querySelector(
      "#jspsych-jumbled-input-textbox"
    ) as HTMLInputElement;
    const button = display_element.querySelector(
      "#jspsych-jumbled-input-next"
    ) as HTMLButtonElement;

    wrapper.style.maxWidth = "800px";
    wrapper.style.margin = "0 auto";
    wrapper.style.padding = "20px";

    stimulus.style.marginBottom = "30px";
    response.style.marginBottom = "25px";

    textbox.style.width = "100%";
    textbox.style.padding = "12px 16px";
    textbox.style.fontSize = "16px";
    textbox.style.border = "2px solid #ddd";
    textbox.style.borderRadius = "8px";
    textbox.style.boxSizing = "border-box";
    textbox.style.resize = "vertical";
    textbox.style.minHeight = "60px";
    textbox.style.overflow = "hidden";

    const autoResize = () => {
      textbox.style.height = "auto";
      textbox.style.height = textbox.scrollHeight + "px";
    };

    button.style.backgroundColor = "#007bff";
    button.style.color = "white";
    button.style.border = "none";
    button.style.padding = "12px 24px";
    button.style.borderRadius = "6px";
    button.style.minWidth = "120px";

    let raw_input = "";
    let display_input = "";

    let keystroke_log = [];
    let last_action_time = start_time;

    textbox.addEventListener("keydown", (e) => {
      const disallowed_chars = [];

      if (e.key == "Dead" || e.code === "Equal") {
        e.preventDefault();
        return;
      }

      if (e.key.length === 1 || e.key === "Enter") {
        e.preventDefault();

        if (disallowed_chars.includes(e.key)) {
          return;
        }

        const typed_char = e.key;
        let mapped_char;

        if (e.key === "Enter") {
          mapped_char = "\n";
        } else if (trial.character_mapping[typed_char]) {
          mapped_char = trial.character_mapping[typed_char];
        } else if (trial.character_mapping[typed_char.toLowerCase()]) {
          // Check lowercase version
          const lowercase_mapping = trial.character_mapping[typed_char.toLowerCase()];
          // If original was uppercase, make mapping uppercase too
          mapped_char =
            typed_char === typed_char.toUpperCase()
              ? lowercase_mapping.toUpperCase()
              : lowercase_mapping;
        } else {
          mapped_char = typed_char;
        }

        raw_input += typed_char;
        display_input += mapped_char;

        textbox.value = display_input;
        autoResize();

        const current_time = performance.now();
        const time_since_last = current_time - last_action_time;

        keystroke_log.push({
          rt: Math.round(time_since_last),
          action: "keypress",
          typed_char: typed_char,
          mapped_char: mapped_char,
        });

        last_action_time = current_time;

        if (trial.require_response) {
          next_button.disabled = display_input.length === 0;
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();

        if (raw_input.length > 0) {
          const deleted_raw_char = raw_input.slice(-1);
          const deleted_display_char = display_input.slice(-1);

          raw_input = raw_input.slice(0, -1);
          display_input = display_input.slice(0, -1);
          textbox.value = display_input;
          autoResize();

          const current_time = performance.now();
          const time_since_last = current_time - last_action_time;

          keystroke_log.push({
            rt: Math.round(time_since_last),
            action: "backspace",
            deleted_raw_char: deleted_raw_char,
            deleted_display_char: deleted_display_char,
          });

          last_action_time = current_time;

          if (trial.require_response) {
            next_button.disabled = display_input.length === 0;
          }
        }
      }
    });

    // Prevent paste operations to maintain character mapping integrity
    textbox.addEventListener("paste", (e) => {
      e.preventDefault();
    });

    textbox.addEventListener("input", (e) => {
      // If textbox value doesn't match our controlled display_input, reset it - this prevents issues with composite keys
      if (textbox.value !== display_input) {
        textbox.value = display_input;
        autoResize();
      }
    });

    // Handle form submission
    const end_trial = () => {
      const end_time = performance.now();
      const rt = Math.round(end_time - start_time);

      const trial_data = {
        response: display_input,
        raw_input: raw_input,
        log: keystroke_log,
        rt: rt,
      };

      this.jsPsych.finishTrial(trial_data);
    };

    autoResize();
    next_button.addEventListener("click", end_trial);
    textbox.focus();
  }
}

export default JumbledInputPlugin;
