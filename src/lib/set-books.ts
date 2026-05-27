export interface SetBook {
  id: string;
  title: string;
  author: string;
  cover: string; // emoji
  synopsis: string;
  themes: string[];
  characters: { name: string; description: string }[];
  studyPoints: string[];
  sampleQuestions: string[];
}

export const SET_BOOKS: SetBook[] = [
  {
    id: "valley-of-tantalika",
    title: "Valley of Tantalika",
    author: "Shimmer Chinodya",
    cover: "🏔️",
    synopsis:
      "A coming-of-age story set in rural Zimbabwe that follows a young protagonist navigating the tension between traditional African values and the encroaching influence of modernity. The novel explores family dynamics, cultural identity, and the painful process of growing up in a society undergoing rapid change.",
    themes: [
      "Tradition vs Modernity — The clash between old customs and new ways of life",
      "Family and Belonging — The role of family bonds in shaping identity",
      "Cultural Identity — The struggle to maintain heritage in a changing world",
      "Growing Up — Loss of innocence and the journey to adulthood",
      "Rural vs Urban Life — Contrasting lifestyles and their impact on characters",
      "Education — Its role as a pathway to opportunity and source of conflict",
    ],
    characters: [
      { name: "Main Protagonist", description: "A young person caught between tradition and modernity, whose journey forms the backbone of the novel" },
      { name: "Father Figure", description: "Represents traditional values and authority; often in conflict with the younger generation" },
      { name: "Mother Figure", description: "A nurturing presence who tries to mediate between tradition and change" },
      { name: "Village Elders", description: "Embody the weight of custom and community expectations" },
    ],
    studyPoints: [
      "Analyse how Chinodya uses the rural setting to reflect the characters' inner conflicts",
      "Examine the symbolism of the 'valley' as a place of both refuge and entrapment",
      "Discuss how language and dialect choices reflect cultural identity",
      "Compare the protagonist's worldview at the beginning and end of the novel",
      "Identify moments where tradition is challenged and how characters respond",
      "Note Chinodya's use of imagery from nature to convey emotion",
    ],
    sampleQuestions: [
      "Discuss how Chinodya portrays the conflict between tradition and modernity in 'Valley of Tantalika'. [25 marks]",
      "How does the setting of the novel contribute to the themes explored? [15 marks]",
      "Examine the role of family relationships in shaping the protagonist's identity. [20 marks]",
      "To what extent is education presented as a source of both hope and conflict? [20 marks]",
    ],
  },
  {
    id: "jabu",
    title: "Jabu",
    author: "Tonderai Matasva",
    cover: "👦",
    synopsis:
      "The novel follows Jabu, a young Zimbabwean navigating the harsh realities of poverty, social inequality, and personal loss. Through Jabu's resilience and moral courage, the story highlights the human capacity to endure and find meaning in adversity. The narrative is rooted in everyday Zimbabwean life and explores what it means to grow up with limited resources but unlimited determination.",
    themes: [
      "Poverty and Resilience — Surviving and thriving despite economic hardship",
      "Moral Growth — Learning right from wrong through experience",
      "Social Inequality — The gap between rich and poor in Zimbabwean society",
      "Friendship and Loyalty — The bonds that sustain people through hard times",
      "Hope and Determination — The refusal to give up despite overwhelming odds",
      "Community — The role of neighbours and society in raising a child",
    ],
    characters: [
      { name: "Jabu", description: "The determined protagonist who faces poverty with courage and moral integrity" },
      { name: "Jabu's Family", description: "Represent the struggles of ordinary Zimbabwean families living in difficult conditions" },
      { name: "Friends/Peers", description: "Provide both support and temptation, testing Jabu's moral compass" },
      { name: "Authority Figures", description: "Teachers, elders, or officials who either help or hinder Jabu's progress" },
    ],
    studyPoints: [
      "Trace Jabu's character development from the beginning to the end of the novel",
      "Analyse how the author uses Jabu's experiences to comment on Zimbabwean society",
      "Examine the role of hardship in shaping moral character",
      "Discuss how friendship is portrayed and its importance to the plot",
      "Identify key turning points in the narrative and their significance",
      "Consider how the ending reflects the novel's central message about hope",
    ],
    sampleQuestions: [
      "How does the author use Jabu's character to explore the theme of resilience? [25 marks]",
      "Discuss the significance of poverty in shaping the events of the novel. [20 marks]",
      "Examine how friendship is portrayed in 'Jabu' and its role in the protagonist's journey. [15 marks]",
      "To what extent does 'Jabu' present a hopeful view of life despite hardship? [20 marks]",
    ],
  },
  {
    id: "animal-farm",
    title: "Animal Farm",
    author: "George Orwell",
    cover: "🐷",
    synopsis:
      "A political allegory in which the animals of Manor Farm overthrow their human master, Mr. Jones, and establish their own government. Initially guided by the ideals of equality and freedom (Animalism), the farm gradually falls under the tyrannical rule of the pigs, led by Napoleon. The novel is a powerful critique of totalitarianism, propaganda, and the corruption of revolutionary ideals.",
    themes: [
      "Power and Corruption — 'All power tends to corrupt; absolute power corrupts absolutely'",
      "Propaganda and Manipulation — How language is used to control and deceive",
      "Equality and Betrayal — The gap between revolutionary ideals and reality",
      "Class and Social Hierarchy — The recreation of the very system the revolution sought to destroy",
      "Education and Ignorance — How lack of education enables oppression",
      "Revolution and its Aftermath — The cycle of oppression",
    ],
    characters: [
      { name: "Napoleon", description: "A Berkshire boar who seizes power through intimidation and manipulation; represents totalitarian dictators" },
      { name: "Snowball", description: "An idealistic pig who genuinely wants to improve animal life; driven out by Napoleon" },
      { name: "Boxer", description: "A loyal, hardworking horse whose motto is 'I will work harder'; represents the exploited working class" },
      { name: "Squealer", description: "Napoleon's propagandist who manipulates language to justify the pigs' actions" },
      { name: "Old Major", description: "The elderly boar whose vision of equality inspires the revolution; represents revolutionary idealists" },
      { name: "Benjamin", description: "A cynical donkey who sees through the pigs' lies but does nothing; represents apathetic intellectuals" },
      { name: "The Dogs", description: "Napoleon's enforcers, raised from puppies to be loyal only to him; represent the secret police" },
    ],
    studyPoints: [
      "Track how the Seven Commandments change throughout the novel and what each change represents",
      "Analyse Napoleon's rise to power — what strategies does he use?",
      "Compare Snowball and Napoleon as leaders: idealism vs pragmatism/tyranny",
      "Examine Squealer's role: identify specific examples of propaganda techniques",
      "Discuss Boxer's fate and what it reveals about how the powerful exploit the loyal",
      "Note the significance of the final scene: 'The creatures outside looked from pig to man, and from man to pig...'",
      "Consider the role of education (or lack of it) in enabling the pigs' control",
      "Identify parallels with real historical events (Russian Revolution context for ZIMSEC)",
    ],
    sampleQuestions: [
      "How does Orwell use the character of Squealer to explore the theme of propaganda? [25 marks]",
      "Discuss the significance of the Seven Commandments in 'Animal Farm'. [20 marks]",
      "Compare and contrast Napoleon and Snowball as leaders. What does Orwell suggest about leadership? [25 marks]",
      "Examine how Boxer's character highlights the exploitation of the working class. [20 marks]",
      "'All animals are equal, but some animals are more equal than others.' Discuss the irony of this statement in the context of the novel. [15 marks]",
    ],
  },
];
