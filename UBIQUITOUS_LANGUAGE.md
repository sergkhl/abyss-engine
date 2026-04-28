# Ubiquitous Language

## Learning garden

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Abyss Engine** | The learning platform where spaced-repetition mastery is represented as growth in a mystical crystal garden. | App, engine, platform |
| **Crystal garden** | The learner-facing world that visualizes knowledge growth as living crystals in an abyssal environment. | Garden, 3D scene, world |
| **Knowledge crystal** | A visual and conceptual representation of a learned topic or concept whose state reflects learner progress. | Crystal, node, item |
| **Abyss** | The immersive environment that contains the learner's crystal garden. | Scene, background, world |
| **SM-2 progression** | The spaced-repetition progression model that determines review timing and mastery state. | SRS, review algorithm, memory score |
| **Ritual attunement** | A learner action or ceremony that reinforces knowledge and advances crystal growth. | Ritual, attunement, ceremony |
| **Buff** | A temporary or persistent learning modifier that changes progression or experience according to defined rules. | Bonus, modifier, power-up |

## Curriculum graph

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Subject** | A broad learning area that contains topics. | Course, domain, area |
| **Topic** | A teachable unit inside a subject with its own learning objective and generated content. | Lesson, concept, node |
| **Topic id** | The stable identifier for a topic in the curriculum graph. | Slug, key, node id |
| **Topic title** | The learner-readable name of a topic. | Label, name, heading |
| **Learning objective** | The specific skill or understanding a topic is meant to teach. | Goal, outcome, target |
| **Subject graph** | The structured map of topics and prerequisite relationships for a subject. | Curriculum graph, knowledge graph, topic graph |
| **Prerequisite edge** | A directed relationship saying one topic must be understood before another topic. | Dependency, prereq, link |
| **Difficulty tier** | One of four ordered levels of learner challenge, from introductory through synthesis and transfer. | Level, difficulty, stage |

## Theory content

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Core concept** | A concise statement of the foundational idea for a topic. | Summary, overview, abstract |
| **Theory content** | The source-grounded explanatory body for a topic. | Lesson text, article, explanation |
| **Key takeaway** | A short learner-facing statement of an essential point from the theory content. | Bullet, highlight, note |
| **Core question** | A learner-facing question tied to a difficulty tier and grounded in the theory content. | Quiz prompt, question, exercise |
| **Mini-game anchor** | Structured content that can be turned directly into an interactive mini-game card set. | Game affordance, activity seed, game data |
| **Category set** | A mini-game anchor where candidate items are sorted into named categories. | Category-sort data, grouping task |
| **Ordered sequence** | A mini-game anchor where steps are arranged into a meaningful order. | Sequence-build data, ordering task |
| **Connection pair** | A mini-game anchor where a term is matched to a related meaning or counterpart. | Match pair, connection-web item |

## Grounding and sources

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Grounding** | The practice of constraining generated learning content with web-searched source evidence. | Research, sourcing, citation pass |
| **Grounding policy** | The rule set that defines search requirements, source thresholds, and accepted or rejected domains. | Search config, source policy |
| **Grounding source** | A retrieved source considered during content generation. | Citation, reference, search result |
| **Accepted source** | A grounding source that satisfies trust and relevance requirements. | Valid source, approved source |
| **Rejected source** | A grounding source excluded because it violates trust, relevance, or domain rules. | Bad source, filtered source |
| **Authoritative primary source** | A high-trust source from an official, standards, scientific, government, or original documentation publisher. | Official source, primary reference |
| **Source trust level** | The classification of a grounding source as high, medium, or rejected. | Trust score, source quality |
| **Provider annotation** | Source metadata attached by the search or model provider after content generation. | Citation metadata, annotation |

## Relationships

- An **Abyss Engine** session contains one **crystal garden**.
- A **crystal garden** contains many **knowledge crystals**.
- A **knowledge crystal** represents one or more learned **topics**.
- A **subject** contains many **topics**.
- A **subject graph** contains many **topics** and many **prerequisite edges**.
- A **prerequisite edge** points from one prerequisite **topic** to one dependent **topic**.
- A **topic** has exactly one **learning objective** in the generated syllabus context.
- A **topic** has one **core concept**, one body of **theory content**, multiple **key takeaways**, and multiple **core questions**.
- A **core question** belongs to exactly one **difficulty tier**.
- A **mini-game anchor** may be a **category set**, **ordered sequence**, or **connection pair** collection.
- A **grounding policy** requires one or more **grounding sources** and may require at least one **authoritative primary source**.
- A **grounding source** is either an **accepted source** or a **rejected source** after trust evaluation.
- **SM-2 progression**, **ritual attunement**, and **buffs** all influence the growth state of **knowledge crystals**.

## Example dialogue

> **Dev:** "When we generate a new **topic**, should its **core questions** come from the **subject graph** or the **theory content**?"
>
> **Domain expert:** "The **subject graph** supplies the **learning objective** and **prerequisite edges**. The **core questions** must be grounded in the generated **theory content** and grouped by **difficulty tier**."
>
> **Dev:** "So a **mini-game anchor** is not itself a playable game yet?"
>
> **Domain expert:** "Correct. A **category set**, **ordered sequence**, or **connection pair** collection is structured source material that can become mini-game cards."
>
> **Dev:** "And for **grounding**, do we keep every source returned by web search?"
>
> **Domain expert:** "No. The **grounding policy** separates **accepted sources** from **rejected sources**, and some topic generation paths require an **authoritative primary source**."
>
> **Dev:** "Once the learner reviews the topic, the **knowledge crystal** grows from **SM-2 progression**, **ritual attunement**, and any active **buffs**?"
>
> **Domain expert:** "Exactly. Those learning signals shape the crystal's growth inside the **crystal garden**."

## Flagged ambiguities

- "Crystal" can mean either a rendered object or the domain concept of a **knowledge crystal**; use **knowledge crystal** when discussing learning state and reserve "crystal" for visual shorthand.
- "Node" can mean a curriculum graph item, a rendered scene object, or a TSL node; use **topic** for curriculum concepts and **knowledge crystal** for learner-facing growth.
- "Graph" can mean **subject graph**, render graph, or node material graph; use **subject graph** when discussing curriculum structure.
- "Source" can mean a web result, a code file, or a provider annotation; use **grounding source** for evidence used in generated learning content.
- "Ritual", "attunement", and "ceremony" are close synonyms; use **ritual attunement** for the domain action unless the product copy intentionally names a specific ceremony.
- "Mini-game affordance" and **mini-game anchor** refer to the same domain concept; prefer **mini-game anchor** because it is clearer for content authors and domain experts.
