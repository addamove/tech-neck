import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";

export default function AboutPage() {
  useEffect(() => {
    document.getElementById("about-title")?.focus({ preventScroll: true });
  }, []);

  return (
    <main className="inner-screen about-screen" aria-labelledby="about-title">
      <span className="eyebrow">ABOUT TECH NECK</span>
      <h1 id="about-title" tabIndex={-1}>
        What is forward head posture?
      </h1>
      <p className="about-introduction">
        Forward head posture means your head sits in front of your shoulders
        rather than comfortably above them. An adult head weighs around 10–12
        pounds. Holding it forward can put extra strain on the muscles
        supporting your neck and upper back. Long periods in the same position
        may contribute to discomfort.
      </p>
      <section>
        <h2>Common causes</h2>
        <p>
          Common contributors include a screen or reading surface that is too
          low, long uninterrupted sessions at a computer, and repeated tasks
          that keep the head tilted or turned. Previous neck strain can also
          affect how your neck feels during these activities.
        </p>
      </section>
      <section>
        <h2>What you may notice</h2>
        <p>
          You may notice an aching or stiff neck, tight shoulders, upper-back
          discomfort, headaches, or difficulty turning your head comfortably.
          These symptoms can have other causes; “tech neck” is not a diagnosis
          for every neck problem.
        </p>
      </section>
      <section>
        <h2>Small changes that help</h2>
        <p>
          Bring screens closer to eye level, support your arms, vary your
          position, and take regular movement breaks. Use this routine as a
          gentle opportunity to move, keeping each exercise comfortable. If a
          movement causes pain, stop. If symptoms persist, or you have tingling
          or weakness in an arm, seek advice from a healthcare professional.
        </p>
      </section>
      <footer className="about-sources">
        <h2>Learn more</h2>
        <a
          href="https://www.mayoclinichealthsystem.org/hometown-health/speaking-of-health/effect-of-technology-on-your-neck"
          target="_blank"
          rel="noopener noreferrer"
        >
          Mayo Clinic Health System{" "}
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        <a
          href="https://www.nhs.uk/symptoms/neck-pain-and-stiff-neck/"
          target="_blank"
          rel="noopener noreferrer"
        >
          NHS <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </footer>
    </main>
  );
}
