import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function BrandMark() {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
      <Box
        aria-hidden
        component="img"
        src="/icon-512.png"
        alt="Weekly Tracker"
        sx={{
          width: 32,
          height: 32,
          borderRadius: 2,
          display: "block",
        }}
      />
      <Typography variant="h6" component="span" noWrap>
        Weekly Tracker
      </Typography>
    </Stack>
  );
}
