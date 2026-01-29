interface CitationProps {
  refId: number | number[];
}

export default function Citation({ refId }: CitationProps) {
  const refs = Array.isArray(refId) ? refId : [refId];

  return (
    <sup className="text-blue-600 font-normal">
      [
      {refs.map((id, index) => (
        <span key={id}>
          <a
            href={`#ref-${id}`}
            className="hover:text-blue-800 no-underline"
          >
            {id}
          </a>
          {index < refs.length - 1 && ','}
        </span>
      ))}
      ]
    </sup>
  );
}
