import { lookupSurname } from "../server/lookup";
import { LookupMessage } from "./LookupMessage";
import { RegisterFindings } from "./RegisterFindings";
import { ResultThread } from "./ResultThread";

/**
 * Streams in under the surname heading once the lookup settles. One branch
 * per explicit lookup state — nothing is inferred from a missing field.
 */
export async function SurnameFindings({ raw }: { raw: string }) {
  const lookup = await lookupSurname(raw);

  switch (lookup.state) {
    case "RESOLVED":
      if (lookup.register === null) {
        return (
          <>
            <ResultThread state="missing" start={<>As listed: {lookup.registerForm}</>} />
            <LookupMessage
              raw={raw}
              title="Name Atlas knows this surname, but holds no register figures for it here."
            >
              <p>The PESEL lists haven&rsquo;t been loaded into this copy of the atlas.</p>
            </LookupMessage>
          </>
        );
      }
      return <RegisterFindings registerForm={lookup.registerForm} register={lookup.register} />;

    case "UNRESOLVED":
      return (
        <>
          <ResultThread state="missing" start="As typed" end="No match" />
          {lookup.reason === "UNKNOWN" ? (
            <LookupMessage
              raw={raw}
              searchAgain
              title="We don’t have this surname in the atlas yet."
            >
              <p>
                Name Atlas draws on Poland&rsquo;s national PESEL lists of current surnames. They
                leave out any surname that occurs only once, so not finding it here doesn&rsquo;t
                mean nobody carries it.
              </p>
              <p>
                Check the spelling exactly as it&rsquo;s written, including letters such as ł, ś or
                ż.
              </p>
            </LookupMessage>
          ) : lookup.reason === "MULTIPLE_EXACT" ? (
            <LookupMessage
              raw={raw}
              searchAgain
              title="This spelling matches more than one surname in the atlas."
            >
              <p>
                We won&rsquo;t guess which one you mean, and choosing between them isn&rsquo;t
                available yet.
              </p>
            </LookupMessage>
          ) : (
            <LookupMessage
              raw={raw}
              searchAgain
              title="This mixes letters from different alphabets."
            >
              <p>
                Some letters look alike across alphabets &mdash; Latin and Cyrillic, for example
                &mdash; so we can&rsquo;t match this safely. Try typing the surname in one alphabet.
              </p>
            </LookupMessage>
          )}
        </>
      );

    case "INVALID_INPUT":
      return lookup.reason === "EMPTY" ? (
        <LookupMessage raw={raw} searchAgain title="Type a surname to begin." />
      ) : lookup.reason === "EXCEEDS_OPERATIONAL_LIMIT" ? (
        <LookupMessage raw={raw} searchAgain title="That’s longer than any surname we can look up.">
          <p>Try the surname on its own.</p>
        </LookupMessage>
      ) : (
        <LookupMessage raw={raw} searchAgain title="That includes characters we can’t read.">
          <p>
            Hidden formatting characters sometimes come along when text is pasted. Try typing the
            surname instead.
          </p>
        </LookupMessage>
      );

    case "LOOKUP_FAILED":
      return (
        <LookupMessage raw={raw} retry title="We couldn’t reach the atlas just now.">
          <p>That says nothing about your surname. Please try again in a moment.</p>
        </LookupMessage>
      );

    case "NOT_CONFIGURED":
      return (
        <LookupMessage raw={raw} title="This copy of Name Atlas isn’t connected to its data.">
          <p>
            Set <code>DATABASE_URL</code> and import the PESEL lists to see results here.
          </p>
        </LookupMessage>
      );
  }
}
