import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function BrandMark() {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
      <img
        src="/icon-512.png"
        alt="Weekly Tracker"
        width={32}
        height={32}
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "block",
        }}
      />
      <Typography variant="h6" component="span" noWrap>
        Weekly Tracker
      </Typography>
    </Stack>
  );
}
